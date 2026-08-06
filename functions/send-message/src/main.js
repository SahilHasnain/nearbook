const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
const apiKey = process.env.APPWRITE_FUNCTION_API_KEY;
const databaseId = "nearbook";
const messagesCollectionId = "messages";
const conversationsCollectionId = "conversations";

function json(res, body, status = 200) {
  return res.json(body, status);
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

    return json(res, message);
  } catch (err) {
    error(`[chat] Message function failed: ${err.message}`);
    return json(res, { message: "Message service unavailable" }, 500);
  }
};
