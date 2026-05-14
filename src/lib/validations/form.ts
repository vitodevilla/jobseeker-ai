import { z } from "zod";

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableTrimmedString(value: unknown) {
  const trimmed = toTrimmedString(value);
  return trimmed === "" ? null : trimmed;
}

function parseDate(value: string, ctx: z.RefinementCtx, message: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: "custom",
      message,
    });

    return z.NEVER;
  }

  return date;
}

function isEnumValue<const Values extends readonly string[]>(
  values: Values,
  value: string,
): value is Values[number] {
  return values.includes(value);
}

export function requiredText(message: string) {
  return z.preprocess(
    toTrimmedString,
    z.string().min(1, message),
  );
}

export const nullableText = z.preprocess(
  toNullableTrimmedString,
  z.string().nullable(),
);

export function nullableInteger(message: string, minimum?: number) {
  return z
    .preprocess(toNullableTrimmedString, z.string().nullable())
    .transform((value, ctx) => {
      if (value === null) {
        return null;
      }

      const parsed = Number.parseInt(value, 10);

      if (
        !Number.isInteger(parsed) ||
        (minimum !== undefined && parsed < minimum)
      ) {
        ctx.addIssue({
          code: "custom",
          message,
        });

        return z.NEVER;
      }

      return parsed;
    });
}

export function nullableDate(message = "Invalid date.") {
  return z
    .preprocess(toNullableTrimmedString, z.string().nullable())
    .transform((value, ctx) => {
      if (value === null) {
        return null;
      }

      return parseDate(value, ctx, message);
    });
}

export function requiredDateTime(message: string) {
  return z
    .preprocess(toTrimmedString, z.string().min(1, message))
    .transform((value, ctx) => parseDate(value, ctx, message));
}

export function requiredEnum<const Values extends readonly [string, ...string[]]>(
  values: Values,
  requiredMessage: string,
  invalidMessage: string,
) {
  return z
    .preprocess(toTrimmedString, z.string().min(1, requiredMessage))
    .transform((value, ctx) => {
      if (!isEnumValue(values, value)) {
        ctx.addIssue({
          code: "custom",
          message: invalidMessage,
        });

        return z.NEVER;
      }

      return value;
    });
}

export function nullableEnum<const Values extends readonly [string, ...string[]]>(
  values: Values,
  invalidMessage: string,
) {
  return z
    .preprocess(toNullableTrimmedString, z.string().nullable())
    .transform((value, ctx) => {
      if (value === null) {
        return null;
      }

      if (!isEnumValue(values, value)) {
        ctx.addIssue({
          code: "custom",
          message: invalidMessage,
        });

        return z.NEVER;
      }

      return value;
    });
}

export function checkboxBoolean(checkedValue = "on") {
  return z.preprocess((value) => value === checkedValue, z.boolean());
}
