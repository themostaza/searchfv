import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Client per uso lato client
export const createClientComponentClient = () => 
  createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server component client
export const createServerComponentClient = () => 
  createClient<Database>(supabaseUrl, supabaseAnonKey);

// Utility per verificare se l'utente è admin
export const isAdmin = async (userId: string): Promise<boolean> => {
  // Per ora consideriamo admin tutti gli utenti autenticati
  // In futuro si può aggiungere una tabella admin_users o usare metadata
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && user.id === userId;
};

// Utility per l'upload di file
export const uploadFile = async (file: File, path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from('files')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }

  // Ottieni l'URL pubblico del file
  const { data: { publicUrl } } = supabase.storage
    .from('files')
    .getPublicUrl(data.path);

  return publicUrl;
};

// Utility per eliminare file
export const deleteFile = async (path: string): Promise<boolean> => {
  const { error } = await supabase.storage
    .from('files')
    .remove([path]);

  if (error) {
    console.error('Error deleting file:', error);
    return false;
  }

  return true;
}; 