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
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    console.log('Uploading file:', { fileName: file.name, path, size: file.size });

    const { data, error } = await supabase.storage
      .from('files')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload failed: No data returned');
    }

    // Ottieni l'URL pubblico del file
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(data.path);

    console.log('File uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadFile function:', error);
    throw error;
  }
};

// Utility per eliminare file
export const deleteFile = async (path: string): Promise<void> => {
  try {
    console.log('Deleting file:', path);
    
    const { error } = await supabase.storage
      .from('files')
      .remove([path]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log('File deleted successfully:', path);
  } catch (error) {
    console.error('Error in deleteFile function:', error);
    throw error;
  }
}; 