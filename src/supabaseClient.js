// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ใช้ Project ID ตัวใหม่ที่คุณหาเจอ
const supabaseUrl = 'https://blhgjzyjmgdxocbqdrdw.supabase.co';

// ใช้คีย์รูปแบบใหม่ตัวล่าสุดของคุณ
const supabaseAnonKey = 'sb_publishable_3nZ3GwOQg5w6fHf6FTfljQ_PbUK89q6'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);