/** Server component-үүдээс API руу хандах туслах (localStorage-гүй) */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // API унтарсан үед хуудас 404 болж, бүхэл апп унахгүй
    return null;
  }
}
