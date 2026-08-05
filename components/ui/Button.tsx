import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";
import { cn } from "@/lib/utils";

interface ButtonProps extends PressableProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

const variants = {
  primary: "bg-indigo-600 active:bg-indigo-700",
  secondary: "bg-slate-100 active:bg-slate-200",
  ghost: "bg-transparent active:bg-slate-100",
  danger: "bg-red-50 active:bg-red-100",
} as const;

const textVariants = {
  primary: "text-white",
  secondary: "text-slate-900",
  ghost: "text-indigo-600",
  danger: "text-red-600",
} as const;

export function Button({
  title,
  loading,
  variant = "primary",
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      className={cn(
        "flex-row items-center justify-center rounded-xl px-4 py-3.5",
        variants[variant],
        (disabled || loading) && "opacity-50",
        className
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#ffffff" : "#4f46e5"}
        />
      ) : (
        <Text className={cn("text-base font-semibold", textVariants[variant])}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
