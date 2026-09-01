import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// 💡 เพิ่ม selectedShopId และ selectedBarberId เข้ามาช่วยกรองข้อมูลแบบไดนามิก
export const useBookings = (selectedDate, selectedShopId, selectedBarberId) => {
  const [bookings, setBookings] = useState([]);

  // ฟังก์ชันดึงข้อมูลจาก Database (คงโครงสร้างเดิม เพิ่มเติมเงื่อนไขกรองร้าน/ช่าง)
  const fetchBookings = async () => {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true });
      
      // 🏪 ถ้ามีการเลือกดูเฉพาะร้านใดร้านหนึ่ง ให้กรองข้อมูลร้านนั้น
      if (selectedShopId) {
        query = query.eq('shop_id', selectedShopId);
      }
      // 👤 ถ้ามีการเลือกดูเฉพาะช่างคนใดคนหนึ่ง ให้กรองข้อมูลช่างคนนั้น
      if (selectedBarberId) {
        query = query.eq('barber_id', selectedBarberId);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setBookings(data);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };
  
  // ระบบ Real-time: อัปเดตทันทีเมื่อมีการ จอง/ลบ/แก้ไขคิว (จะทำงานใหม่เมื่อสลับ ร้าน หรือ ช่าง)
  useEffect(() => {
    fetchBookings(); // ดึงครั้งแรกตอนโหลดคอมโพเนนต์

    const channel = supabase
      .channel('barber-realtime')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedShopId, selectedBarberId]); // 💡 ใส่ Dependency เพิ่มเพื่อให้ดึงข้อมูลคิวใหม่ทันทีเวลาเปลี่ยนร้าน/ช่าง

  // กรองข้อมูลให้แสดงเฉพาะวันที่เลือกในปฏิทิน (คงเงื่อนไขเดิมของคุณไว้เป๊ะๆ)
  const filteredBookings = bookings ? bookings.filter(b => 
    b.booking_date && new Date(b.booking_date).toDateString() === selectedDate.toDateString()
  ) : [];

  // ส่งข้อมูลออกไปใช้งาน
  return { bookings: bookings || [], filteredBookings };
};