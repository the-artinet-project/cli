import { z } from "zod/v3";

export function safeParse(
  data: string,
  schema: z.ZodSchema
): z.SafeParseReturnType<z.infer<typeof schema>, z.infer<typeof schema>> {
  if (!data) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Data is undefined",
          fatal: false,
        },
      ]),
    };
  }
  if (data === "{}" || data === "[]" || data === "") {
    return {
      success: true,
      data: {} as z.infer<typeof schema>,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: new z.ZodError([
          {
            code: "custom",
            path: [],
            message: error.message,
            fatal: false,
          },
        ]),
      };
    }
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: JSON.stringify(error),
          fatal: false,
        },
      ]),
    };
  }
  return schema.safeParse(parsed);
}

export function safeParseJSON(input: string): {
  success: boolean;
  data?: any;
  error?: any;
} {
  if (!input || input === "{}" || input === "[]" || input === "") {
    return {
      success: true,
      data: {} as any,
    };
  }
  try {
    const parsed = JSON.parse(input);
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
}
