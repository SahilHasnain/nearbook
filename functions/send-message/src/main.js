const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
const apiKey = process.env.APPWRITE_FUNCTION_API_KEY;
const databaseId = "nearbook";
const messagesCollectionId = "messages";
const conversationsCollectionId = "conversations";
const notificationsCollectionId = "notifications";

function json(res, body, status = 200) {
  return res.json(body, status);
}

async function sendPush(userId, title, messageText, data, headers, error) {
  try {
    const prefsResponse = await fetch(`${endpoint}/users/${userId}/prefs`, { headers });
    if (!prefsResponse.ok) throw new Error(await prefsResponse.text());
    const prefs = await prefsResponse.json();
    if (typeof prefs.expoPushToken !== "string" || !prefs.expoPushToken.startsWith("ExponentPushToken[")) return;
    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: prefs.expoPushToken, title, body: messageText, data, sound: "default", channelId: "default" }),
    });
    if (!pushResponse.ok) throw new Error(await pushResponse.text());
  } catch (pushError) {
    error(`[push] Could not notify ${userId}: ${pushError.message}`);
  }
}

export default async ({ req, res, error }) => {
  if (req.method !== "POST") {
    return json(res, { message: "Method not allowed" }, 405);
  }

  const body = req.bodyJson ?? {};
  const required = ["conversationId", "senderId", "recipientId", "text"];

  if (!body.jwt || !body.senderId) {
    return json(res, { message: "Authenticated sender is required" }, 401);
  }
  const accountResponse = await fetch(`${endpoint}/account`, {
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-JWT": body.jwt,
    },
  });
  const authenticatedUser = await accountResponse.json();
  if (!accountResponse.ok || authenticatedUser.$id !== body.senderId) {
    return json(res, { message: "Invalid authentication" }, 401);
  }
  if (required.some((key) => typeof body[key] !== "string" || !body[key].trim())) {
    return json(res, { message: "Invalid message data" }, 400);
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": projectId,
    "X-Appwrite-Key": apiKey,
  };
  const messagesUrl = `${endpoint}/databases/${databaseId}/collections/${messagesCollectionId}/documents`;
  const permissions = [
    `read("user:${body.senderId}")`,
    `read("user:${body.recipientId}")`,
  ];

  try {
    const messageResponse = await fetch(messagesUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: "unique()",
        data: {
          conversationId: body.conversationId,
          senderId: body.senderId,
          text: body.text.trim(),
        },
        permissions,
      }),
    });
    const message = await messageResponse.json();
    if (!messageResponse.ok) {
      error(`[chat] Message creation failed: ${JSON.stringify(message)}`);
      return json(res, message, messageResponse.status);
    }

    const conversationUrl = `${endpoint}/databases/${databaseId}/collections/${conversationsCollectionId}/documents/${body.conversationId}`;
    const conversationResponse = await fetch(conversationUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        data: {
          lastMessage: body.text.trim(),
          lastMessageAt: message.$createdAt,
        },
      }),
    });
    if (!conversationResponse.ok) {
      error(`[chat] Conversation update failed: ${await conversationResponse.text()}`);
    }

    try {
      const [senderResponse, conversationInfoResponse] = await Promise.all([
        fetch(`${endpoint}/users/${body.senderId}`, { headers }),
        fetch(conversationUrl, { headers }),
      ]);
      const sender = senderResponse.ok ? await senderResponse.json() : null;
      const conversation = conversationInfoResponse.ok ? await conversationInfoResponse.json() : null;
      const senderName = sender?.name || "New message";
      const notificationData = {
        userId: body.recipientId,
        type: "message",
        title: senderName,
        body: body.text.trim().slice(0, 500),
        conversationId: body.conversationId,
        ...(conversation?.listingId ? { listingId: conversation.listingId } : {}),
        read: false,
      };
      const notificationResponse = await fetch(
        `${endpoint}/databases/${databaseId}/collections/${notificationsCollectionId}/documents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            documentId: "unique()",
            data: notificationData,
            permissions: [`read("user:${body.recipientId}")`, `update("user:${body.recipientId}")`],
          }),
        }
      );
      if (!notificationResponse.ok) {
        error(`[push] Message notification document failed: ${await notificationResponse.text()}`);
      } else {
        await sendPush(
          body.recipientId,
          senderName,
          body.text.trim(),
          { conversationId: body.conversationId, ...(conversation?.listingId ? { listingId: conversation.listingId } : {}) },
          headers,
          error
        );
      }
    } catch (notificationError) {
      error(`[push] Message notification failed: ${notificationError.message}`);
    }

    return json(res, message);
  } catch (err) {
    error(`[chat] Message function failed: ${err.message}`);
    return json(res, { message: "Message service unavailable" }, 500);
  }
};
