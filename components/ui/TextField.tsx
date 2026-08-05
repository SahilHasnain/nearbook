import { Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextField({ label, error, className, ...props }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-slate-700">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#94a3b8"
        className={[
          "rounded-xl border bg-white px-4 py-3 text-base text-slate-900",
          error ? "border-red-400" : "border-slate-200",
          className,
        ].join(" ")}
        {...props}
      />
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
