"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { Receipt } from "@/lib/types";

export async function getReceipts(): Promise<Receipt[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("receipts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Receipt[];
}

/**
 * Uploads a receipt image/PDF to private storage and creates a `receipts` row
 * with ocr_status='pending'. Actual OCR text extraction is the next-phase hook:
 * a Supabase Edge Function (or external OCR API) can watch for pending rows
 * and fill in ocr_merchant / ocr_amount / ocr_date / ocr_raw_text, then flip
 * ocr_status to 'done'. The UI already renders whatever state is present.
 */
export async function uploadReceipt(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const path = `${user.id}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("receipts")
    .insert({ user_id: user.id, storage_path: path, ocr_status: "pending" })
    .select("*")
    .single();
  if (error) throw error;

  revalidatePath("/transactions");
  return data as Receipt;
}

export async function getReceiptUrl(storagePath: string): Promise<string | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteReceipt(id: string, storagePath: string) {
  const { supabase } = await requireUser();
  await supabase.storage.from("receipts").remove([storagePath]);
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/transactions");
}
