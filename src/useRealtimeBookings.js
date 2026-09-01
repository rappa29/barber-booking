// src/useRealtimeBookings.js
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export const useRealtimeBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      // เปลี่ยนจาก created_at เป็น booking_date เพื่อให้เรียงตามเวลาที่จองจริง
      .order('booking_date', { ascending: true }); 

    if (!error) {
      setBookings(data);
    } else {
      console.error("Error fetching:", error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();

    // ตรวจสอบว่าชื่อ Channel ไม่ซ้ำกับที่อื่น
    const channel = supabase
      .channel('barber-changes') 
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('Real-time Update!', payload);
          fetchBookings(); // อัปเดตข้อมูลทันทีเมื่อมีการ Insert/Update/Delete
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { bookings, loading };
};