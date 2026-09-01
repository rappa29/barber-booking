import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import html2canvas from 'html2canvas';
import { supabase } from './supabaseClient';
import { useBookings } from './useBookings';

// ✂️ รายการทรงผมและบริการ
const SERVICES_CATEGORIES = [
  {
    category: '✂️ 1. หมวดทรงผม (เลือกทรงผมหลัก)',
    items: [
      { id: 'two_block', name: 'ทูบล็อค (Two Block)', price: 1, duration: 40, icon: '💇‍♂️' },
      { id: 'undercut', name: 'อันเดอร์คัต (Undercut)', price: 1, duration: 40, icon: '✂️' },
      { id: 'fade', name: 'ตัดเฟดไล่ระดับ (Skin Fade / Taper)', price: 1, duration: 45, icon: '💈' },
      { id: 'mullet', name: 'มัลเล็ต (Mullet)', price: 1, duration: 40, icon: '⚡' },
      { id: 'crop', name: 'ครอปสั้นแฟชั่น (French Crop)', price: 1, duration: 35, icon: '✂️' },
      { id: 'side_part', name: 'วินเทจปาดข้าง (Side Part / Slick Back)', price: 1, duration: 40, icon: '🎩' },
      { id: 'scissor_cut', name: 'ตัดกรรไกรล้วน (ทรงสุภาพ)', price: 1, duration: 45, icon: '✂️' },
      { id: 'student', name: 'ทรงนักเรียน / ข้าราชการ', price: 1, duration: 25, icon: '👦' },
      { id: 'head_shave', name: 'โกนศีรษะเกลี้ยง', price: 1, duration: 35, icon: '👨‍🦲' },
    ]
  },
  {
    category: '🪒 2. หมวดบริการเสริม: หนวดเครา & ใบหน้า',
    items: [
      { id: 'shave_blade', name: 'โกนหนวดด้วยใบมีดพรีเมียม', price: 1, duration: 20, icon: '🪒' },
      { id: 'beard_trim', name: 'กันขอบและแต่งทรงหนวดเครา', price: 1, duration: 20, icon: '🧔' },
      { id: 'face_shave', name: 'กันหน้า + โกนไรขนใบหน้า', price: 1, duration: 15, icon: '✨' },
      { id: 'ear_clean', name: 'แคะหู / ปั่นหูสไตล์วินเทจ', price: 1, duration: 20, icon: '👂' },
    ]
  },
  {
    category: '🧴 3. หมวดบริการเสริม: สระเซ็ต & บำรุง',
    items: [
      { id: 'hair_wash', name: 'สระผมทำความสะอาด', price: 1, duration: 15, icon: '🚿' },
      { id: 'set_pomade', name: 'ไดร์เซ็ตทรงด้วยโพเมด / แว็กซ์', price: 1, duration: 15, icon: '🧴' },
      { id: 'hair_spa', name: 'สปาหมักทรีทเม้นท์ดีท็อกซ์หนังศีรษะ', price: 1, duration: 30, icon: '💆‍♂️' },
    ]
  },
  {
    category: '🎨 4. หมวดบริการเสริม: เคมี & ดัด & สี',
    items: [
      { id: 'down_perm', name: 'ดาวน์เพิร์ม (กดผมด้านข้าง)', price: 1, duration: 45, icon: '📐' },
      { id: 'volume_perm', name: 'ดัดผมวอลลุ่มสไตล์เกาหลี', price: 1, duration: 90, icon: '🌀' },
      { id: 'color_gray', name: 'ย้อมปิดผมขาว', price: 1, duration: 45, icon: '🖤' },
      { id: 'color_fashion', name: 'ทำสีผมแฟชั่น', price: 1, duration: 90, icon: '🎨' },
    ]
  }
];

// ⏰ สล็อตเวลาทำการ 10:30 - 20:30 น. (สล็อตละ 30 นาที)
const TIME_SLOTS = [
  '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

function CustomerPage() {
  const [name, setName] = useState(localStorage.getItem('barberCustomerName') || '');
  const [phone, setPhone] = useState(localStorage.getItem('barberPhone') || '');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(''); // ⏰ สล็อตเวลาที่ลูกค้าเลือก
  
  const [selectedServices, setSelectedServices] = useState([SERVICES_CATEGORIES[0].items[0]]);
  const [myPhone, setMyPhone] = useState(localStorage.getItem('barberPhone') || '');

  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [password, setPassword] = useState('');

  const [shops, setShops] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null); 
  const [selectedBarberId, setSelectedBarberId] = useState(''); 

  // ข้อมูลสถิติคิวบนปฏิทิน
  const [allBookingsCount, setAllBookingsCount] = useState({});

  // ข้อมูลสถิติและรายการรีวิวช่าง
  const [reviewsData, setReviewsData] = useState({});
  const [rawReviews, setRawReviews] = useState([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [viewingBarber, setViewingBarber] = useState(null);

  // Ticket Modal & Ref บันทึกรูป
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const ticketRef = useRef(null);
  const [isSavingImage, setIsSavingImage] = useState(false);

  // Payment & Review Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentPayingBooking, setCurrentPayingBooking] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetBarber, setReviewTargetBarber] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Alerts
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetDeleteId, setTargetDeleteConfirmId] = useState(null);

  const passwordInputRef = useRef(null);

  const { bookings, filteredBookings } = useBookings(
    selectedDate, 
    selectedShop ? selectedShop.id : null, 
    selectedBarberId
  );

  const triggerAlert = (msg) => {
    setAlertMessage(msg);
    setShowAlert(true);
  };

  // 📅 ฟังก์ชันแปลง Date เป็นสตริง YYYY-MM-DD
  const formatLocalDate = (d) => {
    if (!d) return '';
    if (typeof d === 'string' && d.includes('-')) {
      return d.substring(0, 10);
    }
    const dateObj = new Date(d);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 📅 ดึงข้อมูลจำนวนคิวเพื่อวาดจุดแดงบนปฏิทิน
  const fetchAllCalendarBookings = async () => {
    let query = supabase.from('bookings').select('booking_date, status, shop_id, barber_id');
    
    if (selectedShop) query = query.eq('shop_id', selectedShop.id);
    if (selectedBarberId) query = query.eq('barber_id', selectedBarberId);

    const { data, error } = await query;
    if (!error && data) {
      const counts = {};
      data.forEach((b) => {
        if (b.booking_date) {
          const dStr = formatLocalDate(b.booking_date);
          counts[dStr] = (counts[dStr] || 0) + 1;
        }
      });
      setAllBookingsCount(counts);
    }
  };

  useEffect(() => {
    fetchAllCalendarBookings();
  }, [selectedShop, selectedBarberId, bookings]);

  // เมื่อเปลี่ยนวันที่ ให้รีเซ็ตเวลาที่เลือกไว้
  useEffect(() => {
    setSelectedTimeSlot('');
  }, [selectedDate, selectedBarberId]);

  const handleLogoutCustomer = () => {
    localStorage.removeItem('barberPhone');
    localStorage.removeItem('barberCustomerName');
    setMyPhone('');
    setName('');
    setPhone('');
    triggerAlert('👋 ออกจากระบบเรียบร้อยแล้ว คุณสามารถกรอกข้อมูลลูกค้าคนใหม่ได้ครับ');
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('barber_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRawReviews(data);

      const summary = {};
      data.forEach((r) => {
        if (!summary[r.barber_id]) summary[r.barber_id] = { total: 0, count: 0 };
        summary[r.barber_id].total += r.rating;
        summary[r.barber_id].count += 1;
      });

      const result = {};
      Object.keys(summary).forEach((id) => {
        result[id] = {
          avg: (summary[id].total / summary[id].count).toFixed(1),
          count: summary[id].count
        };
      });
      setReviewsData(result);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    const fetchShops = async () => {
      const { data } = await supabase.from('shops').select('*');
      if (data) setShops(data);
    };
    fetchShops();
  }, []);

  useEffect(() => {
    const fetchBarbers = async () => {
      if (!selectedShop) {
        setBarbers([]);
        return;
      }
      const { data } = await supabase
        .from('barbers')
        .select('*')
        .eq('shop_id', selectedShop.id)
        .eq('is_available', true);
      if (data) {
        setBarbers(data);
        setSelectedBarberId(''); 
      }
    };
    fetchBarbers();
  }, [selectedShop]);

  useEffect(() => {
    if (showAdminModal && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current.focus();
      }, 50);
    }
  }, [showAdminModal]);

  useEffect(() => {
    if (myPhone && bookings.length > 0) {
      const myTurn = bookings.find(b => b.phone === myPhone && b.status === 'in_progress');
      if (myTurn) {
        triggerAlert(`🔔 ถึงคิวคุณ ${myTurn.name} แล้วครับ! กรุณาเชิญที่เก้าอี้ตัดผมได้เลยครับ`);
      }

      const myCompletedBooking = bookings.find(b => b.phone === myPhone && b.status === 'completed');
      if (myCompletedBooking && !localStorage.getItem(`paid_${myCompletedBooking.id}`)) {
        setCurrentPayingBooking(myCompletedBooking);
        setShowPaymentModal(true);
        setShowReviewModal(false);
      }
    }
  }, [bookings, myPhone]);

  const handleOpenComments = (e, barber) => {
    e.stopPropagation();
    setViewingBarber(barber);
    setShowCommentsModal(true);
  };

  const handleSaveTicketImage = async () => {
    if (!ticketRef.current) return;
    setIsSavingImage(true);

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsSavingImage(false);
            return;
          }
          const file = new File([blob], `Queue-${ticketData.queueNo}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `บัตรคิว #${ticketData.queueNo}`,
                text: `บัตรคิวร้าน Barber Classic ลำดับที่ ${ticketData.queueNo}`
              });
              setIsSavingImage(false);
              return;
            } catch (err) {}
          }
        });
      }

      const imageURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageURL;
      link.download = `BarberClassic-Queue-${ticketData.queueNo}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      triggerAlert('❌ ไม่สามารถบันทึกรูปภาพได้ กรุณาลองแคปหน้าจอแทนครับ');
    } finally {
      setIsSavingImage(false);
    }
  };

  const toggleService = (srv) => {
    const exists = selectedServices.some(item => item.id === srv.id);
    if (exists) {
      if (selectedServices.length === 1) {
        triggerAlert("⚠️ กรุณาเลือกบริการอย่างน้อย 1 รายการครับ");
        return;
      }
      setSelectedServices(selectedServices.filter(item => item.id !== srv.id));
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  const totalPrice = selectedServices.reduce((sum, item) => sum + item.price, 0);
  const totalDuration = selectedServices.reduce((sum, item) => sum + item.duration, 0);
  const combinedServiceName = selectedServices.map(item => item.name).join(' + ');

  // 🔒 ฟังก์ชันตรวจสอบว่าสล็อตเวลานั้นไม่ว่าง หรือผ่านเวลาไปแล้ว
  const isTimeSlotBooked = (slotTime) => {
    const selectedDateStr = formatLocalDate(selectedDate);
    const now = new Date();
    const todayStr = formatLocalDate(now);

    // 1. ถ้าเป็นวันที่ของวันนี้ และเวลาผ่านไปแล้ว ให้ปิดการจอง
    if (selectedDateStr === todayStr) {
      const [slotHours, slotMinutes] = slotTime.split(':').map(Number);
      const slotDate = new Date();
      slotDate.setHours(slotHours, slotMinutes, 0, 0);
      if (slotDate < now) {
        return { booked: true, reason: 'เวลาผ่านไปแล้ว' };
      }
    }

    // 2. ตรวจสอบการจองซ้ำของช่างในวันและเวลานั้น
    const isConflict = filteredBookings.some((b) => {
      if (!b.booking_date || b.status === 'completed') return false;
      const bDate = formatLocalDate(b.booking_date);
      if (bDate !== selectedDateStr) return false;

      // สกัดเวลา เช่น "2026-09-27T11:00:00" -> "11:00"
      const bTime = b.booking_date.includes('T') 
        ? b.booking_date.split('T')[1].substring(0, 5) 
        : b.booking_date.substring(11, 16);

      return bTime === slotTime;
    });

    return { booked: isConflict, reason: isConflict ? 'คิวเต็มแล้ว' : '' };
  };

  const handleBooking = async () => {
    if (!name || !phone || !selectedShop || !selectedBarberId) {
      triggerAlert("❌ ข้อมูลไม่ครบถ้วน! กรุณากรอกชื่อ เบอร์โทร และ 'คลิกเลือกพนักงานช่าง' บนการ์ดให้เรียบร้อยก่อนยืนยันการจองครับ");
      return;
    }

    if (!selectedTimeSlot) {
      triggerAlert("⏰ กรุณาคลิกเลือก 'รอบเวลาบริการ (10:30 - 20:30 น.)' ที่ต้องการจองครับ");
      return;
    }

    if (selectedServices.length === 0) {
      triggerAlert("❌ กรุณาเลือกบริการหรือทรงผมอย่างน้อย 1 รายการครับ");
      return;
    }

    // ประกอบวันและเวลา เช่น "2026-09-27T14:30:00"
    const finalBookingDateTime = `${formatLocalDate(selectedDate)}T${selectedTimeSlot}:00`;
    const chosenBarber = barbers.find(b => b.id === selectedBarberId);
    
    const { error } = await supabase.from('bookings').insert([
      { 
        name: name, 
        phone: phone, 
        booking_date: finalBookingDateTime, 
        status: 'waiting',
        shop_id: selectedShop.id,       
        barber_id: selectedBarberId,
        service: combinedServiceName,
        price: totalPrice
      }
    ]);

    if (!error) {
      setMyPhone(phone);
      localStorage.setItem('barberPhone', phone); 
      localStorage.setItem('barberCustomerName', name);

      setTicketData({
        queueNo: filteredBookings.length + 1,
        customerName: name,
        phone: phone,
        barberName: chosenBarber?.name || 'ช่างประจำร้าน',
        shopName: selectedShop.name,
        service: combinedServiceName,
        price: totalPrice,
        totalDuration: totalDuration,
        date: finalBookingDateTime
      });
      setShowTicketModal(true);

      setSelectedTimeSlot('');
      fetchAllCalendarBookings();
    } else {
      triggerAlert(`❌ จองไม่สำเร็จ: ${error.message}`);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    if (currentPayingBooking) {
      localStorage.setItem(`paid_${currentPayingBooking.id}`, 'true');
      const barberInfo = barbers.find(b => b.id === currentPayingBooking.barber_id);
      setReviewTargetBarber(barberInfo || { id: currentPayingBooking.barber_id, name: 'ช่างประจำร้าน' });
      setShowReviewModal(true);
    }
  };

  const handleSubmitReview = async () => {
    const targetId = reviewTargetBarber?.id || selectedBarberId;
    if (targetId) {
      await supabase.from('barber_reviews').insert([
        { barber_id: targetId, rating: rating, comment: reviewComment }
      ]);
      fetchReviews();
    }
    setShowReviewModal(false);
    setReviewComment('');
    triggerAlert("🌟 ขอบคุณสำหรับคะแนนประเมินการบริการครับ!");
  };

  const updateQueueStatus = async (id, currentStatus) => {
    let nextStatus = currentStatus === 'waiting' || !currentStatus ? 'in_progress' : currentStatus === 'in_progress' ? 'completed' : 'waiting';
    await supabase.from('bookings').update({ status: nextStatus }).eq('id', id);
  };

  const confirmDeleteQueue = async () => {
    if (targetDeleteId) {
      await supabase.from('bookings').delete().eq('id', targetDeleteId);
      setShowDeleteConfirm(false);
      setTargetDeleteConfirmId(null);
    }
  };

  const checkPasswordDirectly = (e) => {
    if (e) e.preventDefault(); 
    if (password === '2948') { 
      setIsTeacherMode(true); 
      setShowAdminModal(false);
      setPassword('');
    } else {
      triggerAlert("❌ รหัสลับของช่างภรภัทรไม่ถูกต้องครับ!");
    }
  };

  const calculateQueueWait = () => {
    const waitingBookings = filteredBookings.filter(b => b.status === 'waiting' || !b.status);
    const inProgressBooking = filteredBookings.find(b => b.status === 'in_progress');

    if (myPhone) {
      const myIndex = filteredBookings.findIndex(b => b.phone === myPhone);
      if (myIndex !== -1) {
        const myBooking = filteredBookings[myIndex];
        if (myBooking.status === 'completed') {
          return { text: '✨ บริการเสร็จสิ้นแล้ว ขอบคุณครับ', isReady: false };
        }
        if (myBooking.status === 'in_progress') {
          return { text: '💈 ถึงคิวคุณแล้ว! กำลังรับบริการ', isReady: true };
        }

        const queuesAhead = filteredBookings.slice(0, myIndex).filter(b => b.status !== 'completed').length;
        return {
          text: queuesAhead === 0 ? '🔥 คิวถัดไปคือคุณ! กรุณาเตรียมตัว' : `มีคิวก่อนหน้าคุณ ${queuesAhead} คิว (~${queuesAhead * 35} นาที)`,
          isReady: queuesAhead === 0
        };
      }
    }

    if (filteredBookings.length > 0) {
      return {
        text: inProgressBooking 
          ? `💈 กำลังให้บริการ 1 คิว (รอคิวอีก ${waitingBookings.length} ท่าน ~${waitingBookings.length * 35} นาที)`
          : `📋 วันนี้มีคิวรอตัดผมทั้งหมด ${waitingBookings.length} คิว (~${waitingBookings.length * 35} นาที)`,
        isReady: false
      };
    }

    return { text: '🟢 วันนี้ยังไม่มีคิวตัดผม สามารถจองเป็นคิวแรกได้เลยครับ', isReady: false };
  };

  const renderCalendarTileContent = ({ date: tileDate, view }) => {
    if (view === 'month') {
      const dStr = formatLocalDate(tileDate);
      const count = allBookingsCount[dStr];
      if (count && count > 0) {
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2px' }}>
            <div style={{
              backgroundColor: '#e53e3e',
              color: 'white',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              lineHeight: '1.1',
              boxShadow: '0 2px 4px rgba(229,62,62,0.4)'
            }}>
              <span>{count}</span>
              <span style={{ fontSize: '8px' }}>คิว</span>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const waitInfo = calculateQueueWait();
  const barberReviewsList = viewingBarber ? rawReviews.filter(r => r.barber_id === viewingBarber.id) : [];

  return (
    <div style={containerStyle}>
      {isTeacherMode ? (
        <button onClick={() => setIsTeacherMode(false)} style={adminLoginTriggerBtn}>กลับหน้าลูกค้า 👤</button>
      ) : (
        <button onClick={() => setShowAdminModal(true)} style={adminLoginTriggerBtn}>เข้าสู่ระบบช่าง ⚙️</button>
      )}

      <h1 style={logoStyle}>BARBER CLASSIC {isTeacherMode && <span style={{fontSize: '24px', color: '#cc0000'}}>(ADMIN)</span>}</h1>
      
      {!isTeacherMode && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '25px', width: '100%', maxWidth: '900px' }}>
          <div style={loginStatusStyle}>
            {myPhone ? (
              <span>🟢 ข้อมูลลูกค้า: <strong>{name ? `${name} (${myPhone})` : myPhone}</strong> 
                <button onClick={handleLogoutCustomer} style={changeBtn}> (เปลี่ยนข้อมูล / ออกจากระบบ)</button>
              </span>
            ) : (
              <span style={{color: '#666'}}>🚩 กรุณาเลือกสาขาและจองคิวเพื่อบันทึกข้อมูลและเข้าสู่ระบบแจ้งเตือน</span>
            )}
          </div>

          {waitInfo && (
            <div style={{
              background: waitInfo.isReady ? '#fff5f5' : '#ebf8ff',
              border: waitInfo.isReady ? '2px solid #feb2b2' : '2px solid #bee3f8',
              color: waitInfo.isReady ? '#c53030' : '#2b6cb0',
              padding: '10px 22px',
              borderRadius: '25px',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              <span>⏱️ สถานะคิว:</span> {waitInfo.text}
            </div>
          )}
        </div>
      )}

      {/* โหมดช่างแอดมิน */}
      {isTeacherMode ? (
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <div style={mainLayout}>
            <div style={sectionStyle}>
              <h3 style={sectionTitle}>📅 จัดการคิวรายวัน</h3>
              <Calendar 
                onChange={setSelectedDate} 
                value={selectedDate} 
                tileContent={renderCalendarTileContent}
              />
            </div>
          </div>
          
          <div style={tableContainer}>
            <h3 style={{textAlign: 'center'}}>📋 ลำดับคิววันที่ {selectedDate.toLocaleDateString('th-TH')}</h3>
            <table style={tableStyle}>
              <thead style={{background: '#004a99', color: 'white'}}>
                <tr>
                  <th style={thStyle}>ลำดับ</th>
                  <th style={thStyle}>เวลา</th>
                  <th style={thStyle}>ลูกค้า</th>
                  <th style={thStyle}>บริการที่เลือก</th>
                  <th style={thStyle}>ราคารวม</th>
                  <th style={thStyle}>สถานะ</th>
                  <th style={thStyle}>การจัดการช่าง</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign:'center', padding:'20px', color:'#999'}}>วันนี้ยังไม่มีการจองคิว</td></tr>
                ) : (
                  filteredBookings.map((b, index) => {
                    const bookingTimeStr = b.booking_date && b.booking_date.includes('T') 
                      ? b.booking_date.split('T')[1].substring(0, 5) 
                      : (b.booking_date ? b.booking_date.substring(11, 16) : '-');

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: '#004a99' }}>⏰ {bookingTimeStr} น.</td>
                        <td style={tdStyle}>{b.name}</td>
                        <td style={{ ...tdStyle, fontSize: '13px', textAlign: 'left', maxWidth: '250px' }}>{b.service || 'ตัดผมวินเทจ'}</td>
                        <td style={{ ...tdStyle, color: '#004a99', fontWeight: 'bold' }}>{b.price || 250} ฿</td>
                        <td style={{...tdStyle, color: b.status === 'in_progress' ? 'red' : b.status === 'completed' ? 'green' : '#666'}}>
                          <strong>{b.status === 'in_progress' ? 'กำลังตัดผม...' : b.status === 'completed' ? 'เสร็จแล้ว' : 'รอคิว'}</strong>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => updateQueueStatus(b.id, b.status)} style={{...actionBtnStyle, background: b.status === 'in_progress' ? '#4caf50' : '#ff9800'}}>
                            {b.status === 'waiting' || !b.status ? 'เรียกเข้าตัด' : b.status === 'in_progress' ? 'ตัดเสร็จแล้ว' : 'ทำซ้ำ'}
                          </button>
                          <button onClick={() => { setTargetDeleteConfirmId(b.id); setShowDeleteConfirm(true); }} style={{...actionBtnStyle, background: '#f44336', marginLeft: '5px'}}>ลบ</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* โหมดลูกค้า */
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {!selectedShop ? (
            <div style={{ width: '100%', maxWidth: '900px' }}>
              <h2 style={{ textAlign: 'center', color: '#002d5a', marginBottom: '20px' }}>🏪 กรุณาเลือกสาขาที่ต้องการใช้บริการ</h2>
              <div style={shopGridStyle}>
                {shops.map(shop => (
                  <div key={shop.id} onClick={() => setSelectedShop(shop)} style={shopCardStyle}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>💈</div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#004a99' }}>{shop.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>📍 ดูรายละเอียดสาขาและพนักงาน</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '1150px' }}>
              <button onClick={() => setSelectedShop(null)} style={backBtnStyle}>⬅️ กลับไปเลือกสาขาอื่น</button>
              
              <div style={{ background: '#004a99', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px' }}>
                <h2 style={{ margin: 0 }}>🏪 {selectedShop.name}</h2>
                <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>เวลาเปิดให้บริการ: 10:30 - 20:30 น. (ทุกวัน)</p>
              </div>

              <div style={mainLayout}>
                {/* 1. เลือกช่าง */}
                <div style={{ ...sectionStyle, flex: 1 }}>
                  <h3 style={sectionTitle}>👤 1. เลือกช่างประจำร้าน</h3>
                  <div style={barberListStyle}>
                    {barbers.map(barber => {
                      const isSelected = selectedBarberId === barber.id;
                      const ratingInfo = reviewsData[barber.id] || { avg: '5.0', count: 0 };
                      return (
                        <div 
                          key={barber.id} 
                          onClick={() => setSelectedBarberId(barber.id)} 
                          style={{
                            ...barberCardStyle,
                            border: isSelected ? '2px solid #004a99' : '1px solid #eee',
                            backgroundColor: isSelected ? '#e3f2fd' : 'white'
                          }}
                        >
                          <img src={barber.avatar_url || 'https://via.placeholder.com/80'} alt={barber.name} style={avatarStyle} />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 3px 0', color: '#002d5a', fontSize: '15px' }}>ช่าง {barber.name} ({barber.nickname || 'ไม่มีชื่อเล่น'})</h4>
                            <div style={{ fontSize: '12px', color: '#666' }}>เพศ: {barber.gender}</div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <span style={{ color: '#d97706', fontSize: '13px', fontWeight: 'bold' }}>
                                ★ {ratingInfo.avg}
                              </span>
                              <button
                                onClick={(e) => handleOpenComments(e, barber)}
                                style={{
                                  background: '#edf2f7',
                                  border: '1px solid #cbd5e0',
                                  color: '#2b6cb0',
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                💬 ดูรีวิว ({ratingInfo.count})
                              </button>
                            </div>
                          </div>
                          <div style={{ ...selectIndicator, backgroundColor: isSelected ? '#004a99' : '#fff', color: isSelected ? 'white' : '#ccc' }}>
                            {isSelected ? '✓ เลือกอยู่' : 'คลิกเลือก'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. ฟอร์มเลือกบริการ + ปฏิทิน + สล็อตเวลา */}
                <div style={{ ...sectionStyle, flex: 1.6 }}>
                  <h3 style={sectionTitle}>✂️ 2. เลือกทรงผมและบริการเสริม</h3>
                  
                  <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '5px', marginBottom: '15px' }}>
                    {SERVICES_CATEGORIES.map((cat, idx) => (
                      <div key={idx} style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#004a99', background: '#edf2f7', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px' }}>
                          {cat.category}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                          {cat.items.map(srv => {
                            const isChosen = selectedServices.some(item => item.id === srv.id);
                            return (
                              <div 
                                key={srv.id} 
                                onClick={() => toggleService(srv)} 
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: isChosen ? '2px solid #004a99' : '1px solid #e2e8f0',
                                  backgroundColor: isChosen ? '#ebf8ff' : '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  boxShadow: isChosen ? '0 2px 6px rgba(0,74,153,0.15)' : 'none'
                                }}
                              >
                                <span style={{ fontSize: '18px' }}>{srv.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#2d3748' }}>{srv.name}</div>
                                  <div style={{ fontSize: '11px', color: '#004a99', fontWeight: 'bold' }}>{srv.price} ฿ <span style={{ color: '#a0aec0', fontWeight: 'normal' }}>(~{srv.duration} น.)</span></div>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: isChosen ? '#004a99' : '#cbd5e0' }}>
                                  {isChosen ? '☑️' : '⬜'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                      📋 <strong>บริการที่เลือก ({selectedServices.length} รายการ):</strong> {combinedServiceName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 'bold', color: '#004a99' }}>
                      <span>เวลารวม: ~{totalDuration} นาที</span>
                      <span style={{ fontSize: '16px', color: '#276749' }}>ยอดรวม: {totalPrice} บาท</span>
                    </div>
                  </div>

                  <h3 style={{ ...sectionTitle, marginTop: '5px' }}>📅 3. เลือกวันที่และรอบเวลาบริการ (10:30 - 20:30 น.)</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <Calendar 
                      onChange={setSelectedDate} 
                      value={selectedDate} 
                      tileContent={renderCalendarTileContent}
                    />
                  </div>

                  {/* ⏰ ส่วนแสดงสล็อตเวลา (Time Slots) */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#002d5a', marginBottom: '8px' }}>
                      ⏰ เลือกรอบเวลาวันที่ {selectedDate.toLocaleDateString('th-TH')}:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '8px' }}>
                      {TIME_SLOTS.map((slot) => {
                        const status = isTimeSlotBooked(slot);
                        const isSelected = selectedTimeSlot === slot;

                        return (
                          <button
                            key={slot}
                            disabled={status.booked}
                            onClick={() => setSelectedTimeSlot(slot)}
                            style={{
                              padding: '10px 4px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #004a99' : '1px solid #e2e8f0',
                              backgroundColor: status.booked ? '#edf2f7' : (isSelected ? '#004a99' : '#fff'),
                              color: status.booked ? '#a0aec0' : (isSelected ? '#fff' : '#2d3748'),
                              cursor: status.booked ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              boxShadow: isSelected ? '0 3px 8px rgba(0,74,153,0.3)' : 'none'
                            }}
                          >
                            <span>{slot} น.</span>
                            <span style={{ fontSize: '9px', marginTop: '2px', fontWeight: 'normal', color: status.booked ? '#e53e3e' : (isSelected ? '#bee3f8' : '#718096') }}>
                              {status.booked ? status.reason : (isSelected ? '✓ เลือกแล้ว' : 'ว่าง')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <input 
                    placeholder="ชื่อลูกค้า" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={inputStyle} 
                  />
                  <input 
                    placeholder="เบอร์โทรศัพท์ (สำหรับแจ้งเตือน)" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    style={{...inputStyle, marginTop: '10px'}} 
                  />
                  
                  <button onClick={handleBooking} style={buttonStyle}>
                    ยืนยันการจองคิว {selectedTimeSlot ? `รอบ ${selectedTimeSlot} น.` : ''} ({totalPrice} ฿)
                  </button>
                </div>
              </div>

              {/* ตารางลำดับคิว */}
              <div style={tableContainer}>
                <h3 style={{textAlign: 'center'}}>📋 ลำดับคิววันที่ {selectedDate.toLocaleDateString('th-TH')}</h3>
                <table style={tableStyle}>
                  <thead style={{background: '#004a99', color: 'white'}}>
                    <tr>
                      <th style={thStyle}>ลำดับ</th>
                      <th style={thStyle}>เวลา</th>
                      <th style={thStyle}>ลูกค้า</th>
                      <th style={thStyle}>บริการที่จอง</th>
                      <th style={thStyle}>ราคารวม</th>
                      <th style={thStyle}>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr><td colSpan={6} style={{textAlign:'center', padding:'20px', color:'#999'}}>วันนี้ยังไม่มีการจองคิว</td></tr>
                    ) : (
                      filteredBookings.map((b, index) => {
                        const bookingTimeStr = b.booking_date && b.booking_date.includes('T') 
                          ? b.booking_date.split('T')[1].substring(0, 5) 
                          : (b.booking_date ? b.booking_date.substring(11, 16) : '-');

                        return (
                          <tr key={b.id} style={{ 
                            background: b.phone === myPhone ? '#e3f2fd' : 'white', 
                            borderBottom: '1px solid #eee' 
                          }}
                          >
                            <td style={tdStyle}>{index + 1}</td>
                            <td style={{ ...tdStyle, fontWeight: 'bold', color: '#004a99' }}>⏰ {bookingTimeStr} น.</td>
                            <td style={tdStyle}>{b.name} {b.phone === myPhone && <small style={{ color: '#004a99', fontWeight: 'bold' }}>(คิวของคุณ)</small>}</td>
                            <td style={{ ...tdStyle, fontSize: '12px', textAlign: 'left', maxWidth: '280px' }}>{b.service || 'ตัดผมวินเทจ / แฟชั่น'}</td>
                            <td style={{ ...tdStyle, color: '#004a99', fontWeight: 'bold' }}>{b.price || 250} ฿</td>
                            <td style={{...tdStyle, color: b.status === 'in_progress' ? 'red' : b.status === 'completed' ? 'green' : '#666'}}>
                              <strong>{b.status === 'in_progress' ? 'กำลังตัดผม...' : b.status === 'completed' ? 'เสร็จแล้ว' : 'รอคิว'}</strong>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 💬 Modal แสดงรายการรีวิวและคอมเมนต์ */}
      {showCommentsModal && viewingBarber && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '420px', padding: '25px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <img src={viewingBarber.avatar_url || 'https://via.placeholder.com/80'} alt={viewingBarber.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h3 style={{ margin: 0, color: '#002d5a', fontSize: '18px' }}>ช่าง {viewingBarber.name}</h3>
                <span style={{ color: '#d97706', fontSize: '13px', fontWeight: 'bold' }}>
                  ★ {reviewsData[viewingBarber.id]?.avg || '5.0'} / 5.0 ({barberReviewsList.length} รีวิว)
                </span>
              </div>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
              {barberReviewsList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '25px 0', fontSize: '14px' }}>
                  ช่างท่านนี้ยังไม่มีรีวิวข้อความครับ
                </div>
              ) : (
                barberReviewsList.map((rev) => (
                  <div key={rev.id} style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: '#ecc94b', fontSize: '14px' }}>
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#a0aec0' }}>
                        {new Date(rev.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#2d3748', lineHeight: '1.5' }}>
                      {rev.comment || '(ให้คะแนนบริการ)'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowCommentsModal(false)}
              style={{ ...confirmButtonStyle, margin: 0, width: '100%', backgroundColor: '#004a99' }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* 🎟️ Modal บัตรคิว Ticket */}
      {showTicketModal && ticketData && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '360px', background: '#fff', borderTop: '8px solid #004a99', padding: '25px' }}>
            <div ref={ticketRef} style={{ width: '100%', background: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '5px' }}>💈</div>
              <h2 style={{ margin: '0 0 2px 0', color: '#002d5a', fontSize: '20px' }}>BARBER CLASSIC</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#718096', fontWeight: 'bold' }}>{ticketData.shopName}</p>
              <span style={{ fontSize: '12px', color: '#a0aec0' }}>บัตรคิวบริการตัดผม</span>

              <div style={{ background: '#ebf8ff', padding: '12px', borderRadius: '12px', margin: '15px 0', width: '100%', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '12px', color: '#2b6cb0', fontWeight: 'bold' }}>หมายเลขคิวของคุณ</span>
                <h1 style={{ margin: '4px 0 0 0', color: '#004a99', fontSize: '36px' }}>#{ticketData.queueNo}</h1>
              </div>

              <div style={{ textAlign: 'left', width: '100%', fontSize: '13px', lineHeight: '1.9', color: '#4a5568' }}>
                <div>👤 <strong>ลูกค้า:</strong> {ticketData.customerName}</div>
                <div>📞 <strong>เบอร์โทร:</strong> {ticketData.phone}</div>
                <div>✂️ <strong>ช่างผู้ให้บริการ:</strong> {ticketData.barberName}</div>
                <div>💈 <strong>บริการ:</strong> {ticketData.service}</div>
                <div>⏱️ <strong>เวลาโดยประมาณ:</strong> ~{ticketData.totalDuration} นาที</div>
                <div>📅 <strong>เวลาจอง:</strong> {new Date(ticketData.date).toLocaleString('th-TH')}</div>
                <div>💰 <strong>ยอดชำระรวม:</strong> <span style={{ color: '#004a99', fontWeight: 'bold', fontSize: '15px' }}>{ticketData.price} บาท</span></div>
              </div>
            </div>

            <hr style={{ width: '100%', borderTop: '1px dashed #cbd5e0', margin: '15px 0' }} />
            
            <button 
              onClick={handleSaveTicketImage} 
              disabled={isSavingImage}
              style={{ ...confirmButtonStyle, backgroundColor: '#38a169', margin: '0 0 10px 0', width: '100%' }}
            >
              {isSavingImage ? '⏳ กำลังบันทึกรูป...' : '💾 บันทึกรูปลงคลังภาพ / เครื่อง'}
            </button>
            <button onClick={() => setShowTicketModal(false)} style={{ ...cancelButtonStyle, margin: 0, width: '100%' }}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* 💳 Modal สแกน QR ชำระเงิน PromptPay */}
      {showPaymentModal && currentPayingBooking && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '360px', padding: '30px 25px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '5px' }}>📱</div>
            <h3 style={{ margin: '0 0 5px 0', color: '#002d5a', fontSize: '20px', fontWeight: 'bold' }}>ชำระเงินค่าบริการ</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#718096' }}>
              บริการเสร็จสิ้นแล้ว กรุณาสแกน QR เพื่อชำระเงิน
            </p>

            <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <img 
                src={`https://promptpay.io/0812345678/${currentPayingBooking.price || 1}.png`} 
                alt="PromptPay QR" 
                style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block', borderRadius: '8px' }} 
              />
              <div style={{ marginTop: '10px', fontSize: '18px', fontWeight: 'bold', color: '#004a99' }}>
                ยอดชำระ: {currentPayingBooking.price || 1} บาท
              </div>
              <div style={{ fontSize: '12px', color: '#a0aec0' }}>พร้อมเพย์ / สแกนจ่ายผ่านทุกธนาคาร</div>
            </div>

            <button 
              onClick={handlePaymentSuccess} 
              style={{ ...confirmButtonStyle, backgroundColor: '#10b981', width: '100%', margin: '0 0 8px 0' }}
            >
              ✅ สแกนจ่ายเงินเรียบร้อยแล้ว
            </button>
            <button 
              onClick={() => setShowPaymentModal(false)} 
              style={{ ...cancelButtonStyle, width: '100%', margin: 0 }}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* ⭐ Modal ประเมินความพึงพอใจ */}
      {showReviewModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '360px', padding: '30px 25px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#002d5a', fontSize: '20px', fontWeight: 'bold' }}>ประเมินความพึงพอใจ</h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 15px 0' }}>
              ช่าง: <strong>{reviewTargetBarber?.name || 'ช่างประจำร้าน'}</strong>
            </p>
            
            <div style={{ display: 'flex', gap: '8px', fontSize: '32px', cursor: 'pointer', marginBottom: '15px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span 
                  key={star} 
                  onClick={() => setRating(star)} 
                  style={{ color: star <= rating ? '#ecc94b' : '#cbd5e0', transition: 'color 0.2s' }}
                >
                  ★
                </span>
              ))}
            </div>

            <textarea 
              placeholder="เขียนคำชมหรือข้อเสนอแนะถึงช่าง..." 
              value={reviewComment} 
              onChange={e => setReviewComment(e.target.value)} 
              style={{ width: '100%', height: '70px', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box', marginBottom: '15px', resize: 'none' }}
            />

            <button onClick={handleSubmitReview} style={{ ...confirmButtonStyle, margin: '0 0 8px 0', width: '100%' }}>🌟 ส่งคะแนนประเมิน</button>
            <button onClick={() => setShowReviewModal(false)} style={{ ...cancelButtonStyle, margin: 0, width: '100%' }}>ข้าม</button>
          </div>
        </div>
      )}

      {/* 🔑 Modal รหัสช่าง */}
      {showAdminModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={modalTitleStyle}>เข้าสู่ระบบช่างภรภัทร</h2>
            <form onSubmit={checkPasswordDirectly} style={{ width: '100%' }}>
              <input 
                ref={passwordInputRef}
                type="password" 
                placeholder="รหัสลับ" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={modalInputStyle}
              />
              <button type="submit" style={confirmButtonStyle}>ยืนยัน</button>
              <button type="button" onClick={() => { setShowAdminModal(false); setPassword(''); }} style={cancelButtonStyle}>ยกเลิก</button>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 Modal แจ้งเตือน */}
      {showAlert && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '380px', borderTop: '5px solid #004a99', padding: '35px 30px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ebf8ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', marginBottom: '15px', color: '#004a99', border: '1px solid #bee3f8' }}>💡</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#2d3748', fontSize: '20px', fontWeight: 'bold' }}>ระบบแจ้งเตือน</h3>
            <p style={{ margin: '0', color: '#4a5568', fontSize: '14px', lineHeight: '1.6', fontWeight: '500', padding: '10px 0' }}>{alertMessage}</p>
            <button onClick={() => setShowAlert(false)} style={{ ...confirmButtonStyle, marginTop: '20px', width: '100%' }}>ตกลง</button>
          </div>
        </div>
      )}

      {/* ⚠️ Modal ยืนยันลบคิว */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '380px', borderTop: '5px solid #e53e3e', padding: '35px 30px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fff5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', marginBottom: '15px', color: '#e53e3e', border: '1px solid #fed7d7' }}>🗑️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#2d3748', fontSize: '20px', fontWeight: 'bold' }}>แน่ใจใช่ไหมที่จะลบ?</h3>
            <p style={{ margin: '0', color: '#4a5568', fontSize: '14px', lineHeight: '1.6' }}>คุณต้องการลบข้อมูลคิวที่เลือกนี้ออกจากระบบแอดมินใช่หรือไม่?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '25px', width: '100%' }}>
              <button onClick={confirmDeleteQueue} style={{ ...confirmButtonStyle, backgroundColor: '#e53e3e', margin: 0, flex: 1 }}>ยืนยันลบ</button>
              <button type="button" onClick={() => { setShowDeleteConfirm(false); setTargetDeleteConfirmId(null); }} style={{ ...cancelButtonStyle, margin: 0, flex: 1, backgroundColor: '#edf2f7', color: '#4a5568', border: '1px solid #cbd5e0' }}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CSS Styles
const containerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', backgroundColor: '#f4f7fa', minHeight: '100vh', fontFamily: 'Arial', position: 'relative' };
const logoStyle = { fontSize: '42px', color: '#002d5a', letterSpacing: '5px', marginBottom: '10px' };
const loginStatusStyle = { background: 'white', padding: '10px 20px', borderRadius: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontSize: '14px' };
const changeBtn = { background: 'none', border: 'none', color: '#004a99', cursor: 'pointer', textDecoration: 'underline' };
const mainLayout = { display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' };
const sectionStyle = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', minWidth: '320px', display: 'flex', flexDirection: 'column' };
const sectionTitle = { color: '#004a99', borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, marginBottom: '15px', fontSize: '15px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '14px', background: '#004a99', color: 'white', border: 'none', borderRadius: '8px', marginTop: '15px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' };
const tableContainer = { width: '100%', marginTop: '40px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '10px', overflow: 'hidden' };
const thStyle = { padding: '15px' };
const tdStyle = { padding: '15px', textAlign: 'center' };

const shopGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px', width: '100%' };
const shopCardStyle = { background: 'white', padding: '30px 20px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #eee' };
const backBtnStyle = { background: '#fff', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px', color: '#555' };
const barberListStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const barberCardStyle = { display: 'flex', alignItems: 'center', gap: '20px', padding: '15px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #eee' };
const avatarStyle = { width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 3px 6px rgba(0,0,0,0.1)', backgroundColor: '#ddd' };
const selectIndicator = { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #ddd' };

const adminLoginTriggerBtn = { position: 'absolute', top: '20px', right: '20px', padding: '8px 15px', background: '#e0e6ed', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#555' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(26, 32, 44, 0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' };
const modalTitleStyle = { color: '#002d5a', fontSize: '22px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' };
const modalInputStyle = { width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box', textAlign: 'center', marginBottom: '15px' };
const confirmButtonStyle = { width: '100%', padding: '14px', background: '#004a99', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' };
const cancelButtonStyle = { width: '100%', padding: '14px', background: '#ccc', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' };
const actionBtnStyle = { border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };

export default CustomerPage;