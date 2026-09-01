import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from './supabaseClient';
import { useBookings } from './useBookings';

function AdminPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // --- 🏪 สถานะการจัดการระบบร้านและพนักงานช่าง ---
  const [shops, setShops] = useState([]);
  const [barbers, setBarbers] = useState([]); 
  const [newShopName, setNewShopName] = useState('');
  
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberNickname, setNewBarberNickname] = useState('');
  const [newBarberGender, setNewBarberGender] = useState('ชาย');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null); // 📸 สเตตสำหรับ Preview รูปภาพโปรไฟล์

  // 🔍 สเตตสำหรับ Search และ Filter คิว
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'waiting', 'in_progress', 'completed'

  // 💳 สเตตสำหรับ Modal สแกนจ่ายเงิน PromptPay QR Code
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrPayData, setQrPayData] = useState(null);

  const { bookings, filteredBookings } = useBookings(selectedDate);
  
  // --- ⚠️ ระบบควบคุมป๊อปอัปยืนยันการลบ (Custom Confirmation Modals) ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetBooking, setTargetBooking] = useState(null);

  const [showShopConfirm, setShowShopConfirm] = useState(false);
  const [targetShop, setTargetShop] = useState(null);

  const [showBarberConfirm, setShowBarberConfirm] = useState(false);
  const [targetBarber, setTargetBarber] = useState(null);

  // 🔔 สเตตสำหรับหน้าป๊อปอัปแจ้งเตือนความผิดพลาด / ข้อมูลไม่ครบ สไตล์ Modern
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // --- ⌨️ ระบบดักฟังปุ่มบนคีย์บอร์ด (Enter / Escape) สำหรับ Modal ลบคิว ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showConfirm) return; 

      if (e.key === 'Enter') {
        e.preventDefault();
        confirmDelete(); 
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowConfirm(false); 
        setTargetBooking(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showConfirm, targetBooking]);

  const triggerAlert = (msg) => {
    setAlertMessage(msg);
    setShowAlert(true);
  };

  // ดึงรายชื่อสาขา/ร้านค้าทั้งหมด
  const fetchShops = async () => {
    try {
      const { data } = await supabase.from('shops').select('*').order('name', { ascending: true });
      if (data) setShops(data);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  // ดึงข้อมูลพนักงานช่างทั้งหมด
  const fetchBarbers = async () => {
    try {
      const { data } = await supabase.from('barbers').select('*').order('name', { ascending: true });
      if (data) setBarbers(data);
    } catch (err) {
      console.error("Error fetching barbers:", err);
    }
  };

  useEffect(() => {
    fetchShops();
    fetchBarbers();
  }, []);

  // ฟังก์ชันจัดการเลือกรูปและสร้าง URL Preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // --- 🏪 ฟังก์ชันสำหรับตั้งชื่อร้านใหม่ ---
  const handleAddShop = async () => {
    if (!newShopName) {
      triggerAlert('❌ กรุณากรอกชื่อร้าน/สาขา ให้ครบถ้วนก่อนกดสร้างร้านครับ');
      return;
    }
    const { error } = await supabase.from('shops').insert([{ name: newShopName }]);
    if (!error) {
      triggerAlert('🎉 สร้างสาขา/ร้านค้าใหม่เข้าสู่ระบบสำเร็จแล้ว!');
      setNewShopName('');
      fetchShops(); 
    } else {
      triggerAlert('❌ สร้างร้านค้าไม่สำเร็จ: ' + error.message);
    }
  };

  // --- 👤 ฟังก์ชันเพิ่มพนักงานช่าง + อัปโหลดรูปภาพลง Storage ---
  const handleAddBarber = async () => {
    if (!newBarberName || !selectedShopId) {
      triggerAlert('❌ ข้อมูลไม่ครบ! กรุณากรอกชื่อ-นามสกุล และเลือกสาขาที่จะบรรจุพนักงานช่างด้วยครับ');
      return;
    }

    let uploadedAvatarUrl = '';

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('barber-avatars')
        .upload(fileName, avatarFile);

      if (uploadError) {
        triggerAlert('❌ อัปโหลดรูปภาพโปรไฟล์ไม่สำเร็จ: ' + uploadError.message);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('barber-avatars').getPublicUrl(fileName);
      uploadedAvatarUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('barbers').insert([
      {
        name: newBarberName,
        nickname: newBarberNickname,
        gender: newBarberGender,
        shop_id: selectedShopId,
        avatar_url: uploadedAvatarUrl,
        is_available: true
      }
    ]);

    if (!error) {
      triggerAlert('🎉 บันทึกข้อมูลพนักงานช่างคนใหม่สำเร็จ!');
      setNewBarberName('');
      setNewBarberNickname('');
      setAvatarFile(null);
      setAvatarPreview(null);
      const avatarInp = document.getElementById('avatarInput');
      if (avatarInp) avatarInp.value = ''; 
      fetchBarbers(); 
    } else {
      triggerAlert('❌ เพิ่มพนักงานล้มเหลว: ' + error.message);
    }
  };

  // 💡 เปิดหน้าเตือนลบร้านค้า
  const openShopConfirm = (shop) => {
    setTargetShop(shop);
    setShowShopConfirm(true);
  };

  // 💡 กดยืนยันลบร้านค้าจริง
  const confirmDeleteShop = async () => {
    if (targetShop) {
      const { error } = await supabase.from('shops').delete().eq('id', targetShop.id);
      if (!error) {
        triggerAlert('🗑️ ลบข้อมูลร้านค้าออกจากระบบเรียบร้อยแล้ว!');
        fetchShops();
        fetchBarbers(); 
      } else {
        triggerAlert('❌ ลบร้านค้าไม่สำเร็จ: ' + error.message);
      }
      setShowShopConfirm(false);
      setTargetShop(null);
    }
  };

  // 💡 เปิดหน้าเตือนลบพนักงาน
  const openBarberConfirm = (barber) => {
    setTargetBarber(barber);
    setShowBarberConfirm(true);
  };

  // 💡 กดยืนยันลบพนักงานจริง
  const confirmDeleteBarber = async () => {
    if (targetBarber) {
      await supabase.from('bookings').delete().eq('barber_id', targetBarber.id);
      const { error } = await supabase.from('barbers').delete().eq('id', targetBarber.id);
      if (!error) {
        triggerAlert('🗑️ ลบข้อมูลพนักงานช่างสำเร็จ!');
        fetchBarbers();
      } else {
        triggerAlert('❌ ลบพนักงานไม่สำเร็จ: ' + error.message);
      }
      setShowBarberConfirm(false);
      setTargetBarber(null);
    }
  };

  // --- 1. ฟังก์ชันสำหรับส่ง Push Notification ---
  const sendPushNotification = async (customerName) => {
    try {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": "Basic os_v2_app_vesdbo6lqfcwno5saupqkrejlxslxngzjibezbv7lge6f3jz3bbp2463b36mbrlcmx2d34mjvln63aqlkwpssy4ci6y5kplqr4lutni"
        },
        body: JSON.stringify({
          app_id: "a92430bb-cb81-4566-bbb2-051f0544895d", 
          included_segments: ["Total Subscriptions"], 
          headings: { "th": "Barber Classic ✂️" },
          contents: { "th": `ถึงคิวคุณ ${customerName} แล้วครับ! เชิญที่โต๊ะตัดผมได้เลย` },
          android_accent_color: "FF004A99",
          priority: 10
        })
      });
    } catch (err) {
      console.error("ส่งแจ้งเตือนไม่สำเร็จ:", err);
    }
  };

  // --- 2. ฟังก์ชันอัปเดตสถานะ ---
  const updateStatus = async (id, newStatus, customerName) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      triggerAlert("❌ อัปเดตสถานะไม่สำเร็จ: " + error.message);
    } else {
      if (newStatus === 'in_progress') {
        sendPushNotification(customerName);
      }
    }
  };

  const openConfirm = (booking) => {
    setTargetBooking(booking);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (targetBooking) {
      const { error } = await supabase.from('bookings').delete().eq('id', targetBooking.id);
      if (error) {
        triggerAlert("❌ ลบคิวไม่สำเร็จ: " + error.message);
      }
      setShowConfirm(false);
      setTargetBooking(null);
    }
  };

  // 📊 คำนวณสรุปสถิติและยอดเงินประจำวัน
  const completedToday = filteredBookings.filter(b => b.status === 'completed');
  const totalIncome = completedToday.reduce((sum, b) => sum + (Number(b.price) || 250), 0);
  const inProgressCount = filteredBookings.filter(b => b.status === 'in_progress').length;
  const waitingCount = filteredBookings.filter(b => !b.status || b.status === 'waiting').length;

  // 🔍 ตัวกรอง Search และ Status
  const displayedBookings = filteredBookings.filter(b => {
    const matchesSearch = (b.name && b.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (b.phone && b.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'waiting' 
        ? (!b.status || b.status === 'waiting')
        : b.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1250px', margin: 'auto', fontFamily: 'Arial', color: '#333' }}>
      <h2 style={{ textAlign: 'center', color: '#002d5a', marginBottom: '30px', letterSpacing: '2px', fontWeight: 'bold' }}>
        ✂️ ระบบจัดการคิวช่าง (Admin Console)
      </h2>

      {/* ─── 📊 1. แดชบอร์ดสรุปรายได้และสถิติคิวประจำวัน ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ ...statCard, borderLeft: '5px solid #38a169' }}>
          <span style={{ fontSize: '13px', color: '#718096' }}>💰 ยอดรายได้ประจำวัน</span>
          <h2 style={{ margin: '5px 0 0 0', color: '#276749' }}>{totalIncome.toLocaleString()} ฿</h2>
          <small style={{ color: '#a0aec0' }}>จากบริการที่ตัดเสร็จแล้ว</small>
        </div>
        <div style={{ ...statCard, borderLeft: '5px solid #004a99' }}>
          <span style={{ fontSize: '13px', color: '#718096' }}>👥 คิวตัดเสร็จแล้ว</span>
          <h2 style={{ margin: '5px 0 0 0', color: '#004a99' }}>{completedToday.length} คิว</h2>
          <small style={{ color: '#a0aec0' }}>ยอดรวมลูกค้าวันนี้</small>
        </div>
        <div style={{ ...statCard, borderLeft: '5px solid #e53e3e' }}>
          <span style={{ fontSize: '13px', color: '#718096' }}>💈 กำลังให้บริการ</span>
          <h2 style={{ margin: '5px 0 0 0', color: '#c53030' }}>{inProgressCount} คิว</h2>
          <small style={{ color: '#a0aec0' }}>อยู่บนเก้าอี้ตัดผม</small>
        </div>
        <div style={{ ...statCard, borderLeft: '5px solid #ff9800' }}>
          <span style={{ fontSize: '13px', color: '#718096' }}>⏳ รอคิวหน้าร้าน</span>
          <h2 style={{ margin: '5px 0 0 0', color: '#d97706' }}>{waitingCount} คิว</h2>
          <small style={{ color: '#a0aec0' }}>กำลังรอเรียกเข้าบริการ</small>
        </div>
      </div>
      
      {/* ─── 🛠 โซนจัดการสาขาและพนักงานดีไซน์โมเดิร์น ─── */}
      <div style={{ display: 'flex', gap: '25px', marginBottom: '30px', flexWrap: 'wrap' }}>
        
        {/* แผงสร้างชื่อร้าน */}
        <div style={{ ...adminPanelBox, flex: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={iconBadge}>🏪</div>
            <h4 style={{ margin: 0, color: '#002d5a', fontSize: '16px', fontWeight: 'bold' }}>ตั้งชื่อร้าน / สาขาใหม่</h4>
          </div>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <input 
              placeholder="เช่น สาขาอุบลทาวน์" 
              value={newShopName} 
              onChange={e => setNewShopName(e.target.value)} 
              style={modernInput} 
            />
            <button onClick={handleAddShop} style={primaryActionBtn}>สร้างร้าน</button>
          </div>
        </div>

        {/* 👤 แผงเพิ่มพนักงานช่างดีไซน์โมเดิร์น (Modern Interactive Card) */}
        <div style={{ ...modernCardStyle, flex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={iconBadge}>✂️</div>
            <div>
              <h4 style={{ margin: 0, color: '#002d5a', fontSize: '16px', fontWeight: 'bold' }}>เพิ่มพนักงานช่างใหม่</h4>
              <small style={{ color: '#718096' }}>กรอกข้อมูลและอัปโหลดโปรไฟล์ช่างประจำสาขา</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* ฝั่งอัปโหลดรูปพร้อม Preview ทันสมัย */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '110px' }}>
              <label htmlFor="avatarInput" style={avatarUploadContainer}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" style={previewImgStyle} />
                ) : (
                  <div style={emptyAvatarStyle}>
                    <span style={{ fontSize: '24px' }}>📷</span>
                    <span style={{ fontSize: '10px', color: '#718096', marginTop: '3px' }}>เลือกรูปภาพ</span>
                  </div>
                )}
                <div style={cameraIconBadge}>✏️</div>
              </label>
              <input 
                id="avatarInput"
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }}
              />
              <small style={{ fontSize: '10px', color: '#a0aec0', marginTop: '6px' }}>แตะเพื่อเปลี่ยนรูป</small>
            </div>

            {/* ฝั่งฟอร์มกรอกข้อมูลแบบ Grid สวยงาม */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', minWidth: '240px' }}>
              <div>
                <label style={inputLabel}>🏪 สังกัดสาขา</label>
                <select value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)} style={modernInput}>
                  <option value="">-- เลือกสาขา --</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label style={inputLabel}>👤 ชื่อ-นามสกุล</label>
                <input 
                  placeholder="เช่น ภรภัทร บุญจันทร์" 
                  value={newBarberName} 
                  onChange={e => setNewBarberName(e.target.value)} 
                  style={modernInput} 
                />
              </div>

              <div>
                <label style={inputLabel}>🏷️ ชื่อเล่น</label>
                <input 
                  placeholder="เช่น ช่างภัทร" 
                  value={newBarberNickname} 
                  onChange={e => setNewBarberNickname(e.target.value)} 
                  style={modernInput} 
                />
              </div>

              <div>
                <label style={inputLabel}>⚧️ เพศ</label>
                <select value={newBarberGender} onChange={e => setNewBarberGender(e.target.value)} style={modernInput}>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="อื่น ๆ">อื่น ๆ</option>
                </select>
              </div>
            </div>
          </div>

          <button onClick={handleAddBarber} style={modernSubmitBtn}>
            ✨ บันทึกเพิ่มพนักงานเข้าสู่ระบบ
          </button>
        </div>

      </div>

      {/* ─── 💡 โซนแผงแสดงผลและกดลบข้อมูลร้านค้า/พนักงานช่าง ─── */}
      <div style={{ display: 'flex', gap: '25px', marginBottom: '40px', flexWrap: 'wrap' }}>
        
        {/* รายชื่อและตัวลบร้านค้า */}
        <div style={{...adminPanelBox, flex: 1}}>
          <h4 style={panelTitleStyle}>📋 รายชื่อร้านค้าทั้งหมด</h4>
          <div style={{maxHeight: '220px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #eef2f5'}}>
            <table style={miniTableStyle}>
              <thead>
                <tr><th style={miniThStyle}>ชื่อร้าน</th><th style={miniThStyle}>จัดการ</th></tr>
              </thead>
              <tbody>
                {shops.length === 0 ? (
                  <tr><td colSpan="2" style={{textAlign:'center', color:'#999', padding:'15px'}}>ยังไม่มีร้านค้าในระบบ</td></tr>
                ) : (
                  shops.map(s => (
                    <tr key={s.id} style={trHoverStyle}>
                      <td style={miniTdStyle}><strong>{s.name}</strong></td>
                      <td style={miniTdStyle}>
                        <button onClick={() => openShopConfirm(s)} style={deleteIconButton}>🗑️ ลบร้าน</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* รายชื่อและตัวลบพนักงานช่าง */}
        <div style={{...adminPanelBox, flex: 2}}>
          <h4 style={panelTitleStyle}>📋 รายชื่อพนักงานช่างทั้งหมด</h4>
          <div style={{maxHeight: '220px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #eef2f5'}}>
            <table style={miniTableStyle}>
              <thead>
                <tr>
                  <th style={miniThStyle}>รูป</th>
                  <th style={miniThStyle}>ชื่อ-นามสกุล (ชื่อเล่น)</th>
                  <th style={miniThStyle}>สังกัดร้าน</th>
                  <th style={miniThStyle}>เพศ</th>
                  <th style={miniThStyle}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {barbers.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign:'center', color:'#999', padding:'15px'}}>ยังไม่มีช่างในระบบ</td></tr>
                ) : (
                  barbers.map(b => {
                    const shopName = shops.find(s => s.id === b.shop_id)?.name || 'ไม่พบสังกัด';
                    return (
                      <tr key={b.id} style={trHoverStyle}>
                        <td style={miniTdStyle}>
                          <img src={b.avatar_url || 'https://via.placeholder.com/40'} alt="Profile" style={miniAvatarStyle} />
                        </td>
                        <td style={miniTdStyle}><strong>{b.name}</strong> ({b.nickname || '-'})</td>
                        <td style={miniTdStyle}><span style={shopBadgeStyle}>{shopName}</span></td>
                        <td style={miniTdStyle}>{b.gender}</td>
                        <td style={miniTdStyle}>
                          <button onClick={() => openBarberConfirm(b)} style={deleteIconButton}>🗑️ ลบพนักงาน</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '40px' }} />
      
      {/* ─── ส่วนแสดงปฏิทินและคิวงาน ─── */}
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: 'fit-content', border: '1px solid #edf2f7' }}>
          <Calendar 
            onChange={setSelectedDate} 
            value={selectedDate} 
            tileContent={({ date, view }) => {
              const count = bookings.filter(b => new Date(b.booking_date).toDateString() === date.toDateString()).length;
              return view === 'month' && count > 0 ? <div style={badgeStyle}>{count} คิว</div> : null;
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '350px' }}>
          <h3 style={{ color: '#004a99', borderBottom: '2px solid #004a99', paddingBottom: '12px', marginTop: 0, fontWeight: 'bold' }}>
            คิววันที่ {selectedDate.toLocaleDateString('th-TH')}
          </h3>

          {/* 🔍 แถบค้นหาและตัวกรองสถานะ (Search & Filters) */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input 
              placeholder="🔍 ค้นหาชื่อ หรือ เบอร์โทรลูกค้า..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ ...modernInput, flex: 1, minWidth: '200px' }}
            />
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setStatusFilter('all')} 
                style={{ ...filterBtn, background: statusFilter === 'all' ? '#004a99' : '#e2e8f0', color: statusFilter === 'all' ? '#fff' : '#4a5568' }}
              >ทั้งหมด</button>
              <button 
                onClick={() => setStatusFilter('waiting')} 
                style={{ ...filterBtn, background: statusFilter === 'waiting' ? '#ff9800' : '#e2e8f0', color: statusFilter === 'waiting' ? '#fff' : '#4a5568' }}
              >รอคิว</button>
              <button 
                onClick={() => setStatusFilter('in_progress')} 
                style={{ ...filterBtn, background: statusFilter === 'in_progress' ? '#e53e3e' : '#e2e8f0', color: statusFilter === 'in_progress' ? '#fff' : '#4a5568' }}
              >กำลังตัด</button>
              <button 
                onClick={() => setStatusFilter('completed')} 
                style={{ ...filterBtn, background: statusFilter === 'completed' ? '#38a169' : '#e2e8f0', color: statusFilter === 'completed' ? '#fff' : '#4a5568' }}
              >เสร็จแล้ว</button>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 25px rgba(0,0,0,0.05)', border: '1px solid #edf2f7' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#004a99', color: 'white' }}>
                <tr>
                  <th style={thStyle}>ลำดับ</th>
                  <th style={thStyle}>ลูกค้า / เบอร์โทร</th>
                  <th style={thStyle}>บริการ / ทรงผม</th>
                  <th style={thStyle}>เวลา</th>
                  <th style={thStyle}>จัดการ / ชำระเงิน</th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '25px', color: '#999' }}>ไม่มีข้อมูลคิวที่ตรงกับการค้นหา</td></tr>
                ) : (
                  displayedBookings.map((b, index) => {
                    const rowBgColor = b.status === 'in_progress' ? '#fff5f5' : b.status === 'completed' ? '#f0fff4' : 'white';
                    const statusColor = b.status === 'in_progress' ? '#e53e3e' : b.status === 'completed' ? '#38a169' : '#4a5568';
                    const statusText = b.status === 'in_progress' ? '🔴 กำลังตัด' : b.status === 'completed' ? '🟢 เสร็จแล้ว' : 'รอรับคิว';

                    return (
                      <tr key={b.id} style={{ backgroundColor: rowBgColor, borderBottom: '1px solid #edf2f7' }}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                          {b.name} <span style={{ fontSize: '12px', color: '#718096' }}>({b.phone || '-'})</span><br/>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: statusColor }}>{statusText}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 'bold', color: '#2d3748' }}>{b.service || 'ตัดผมวินเทจ / แฟชั่น'}</span><br/>
                          <span style={{ fontSize: '12px', color: '#004a99', fontWeight: 'bold' }}>({b.price || 250} ฿)</span>
                        </td>
                        <td style={tdStyle}>{new Date(b.booking_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            {(!b.status || b.status === 'waiting') && (
                              <button onClick={() => updateStatus(b.id, 'in_progress', b.name)} style={btnStart}>รับคิว</button>
                            )}
                            {b.status === 'in_progress' && (
                              <button onClick={() => updateStatus(b.id, 'completed', b.name)} style={btnFinish}>เสร็จแล้ว</button>
                            )}
                            {/* 💳 ปุ่มเปิด PromptPay Dynamic QR Code */}
                            <button 
                              onClick={() => { setQrPayData(b); setShowQRModal(true); }} 
                              style={{ ...btnFinish, backgroundColor: '#004a99', boxShadow: '0 2px 5px rgba(0,74,153,0.2)' }}
                            >
                              💳 สแกนจ่าย
                            </button>
                            <button onClick={() => openConfirm(b)} style={btnDel}>ลบ</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 💳 Modal สร้าง QR Code PromptPay ตามยอดจริง ─── */}
      {showQRModal && qrPayData && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, maxWidth: '350px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#002d5a' }}>สแกนชำระเงิน</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#718096' }}>
              ลูกค้า: คุณ <strong>{qrPayData.name}</strong> ({qrPayData.service || 'ตัดผม'})
            </p>
            <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid #eee' }}>
              <img 
                src={`https://promptpay.io/0629921003/${qrPayData.price || 250}.png`} 
                alt="PromptPay QR" 
                style={{ width: '200px', height: '200px', display: 'block', margin: 'auto' }} 
              />
            </div>
            <h2 style={{ color: '#004a99', margin: '15px 0 20px 0' }}>ยอดชำระ: {qrPayData.price || 250} บาท</h2>
            <button onClick={() => setShowQRModal(false)} style={{ ...modalConfirmBtn, backgroundColor: '#004a99', width: '100%' }}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}

      {/* ─── ⚠️ 1. หน้าต่างป๊อปอัปยืนยันการลบคิวลูกค้า ─── */}
      {showConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={modalIconContainer}>📋</div>
            <h3 style={modalTitleText}>แน่ใจใช่ไหมที่จะลบคิว?</h3>
            <p style={modalBodyText}>
              คุณต้องการลบข้อมูลคิวของ <strong style={{ color: '#004a99' }}>คุณ {targetBooking?.name}</strong> ใช่หรือไม่?
            </p>
            <div style={modalActionGroup}>
              <button onClick={confirmDelete} style={modalConfirmBtn}>ยืนยันลบข้อมูล</button>
              <button onClick={() => { setShowConfirm(false); setTargetBooking(null); }} style={modalCancelBtn}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ⚠️ 2. หน้าต่างป๊อปอัปยืนยันการลบร้านค้า ─── */}
      {showShopConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ ...modalIconContainer, backgroundColor: '#fff5f5', color: '#e53e3e', border: '1px solid #fed7d7' }}>🏪</div>
            <h3 style={modalTitleText}>แน่ใจใช่ไหมที่จะลบร้านค้า?</h3>
            <p style={modalBodyText}>
              คุณต้องการลบร้าน <strong style={{ color: '#e53e3e' }}>"{targetShop?.name}"</strong> ใช่หรือไม่? <br />
              <span style={{ fontSize: '12px', color: '#e53e3e', fontWeight: 'bold' }}>⚠️ ข้อมูลช่างและคิวจองในร้านนี้จะถูกลบออกทั้งหมด!</span>
            </p>
            <div style={modalActionGroup}>
              <button onClick={confirmDeleteShop} style={modalConfirmBtn}>ยืนยันลบร้านค้า</button>
              <button onClick={() => { setShowShopConfirm(false); setTargetShop(null); }} style={modalCancelBtn}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ⚠️ 3. หน้าต่างป๊อปอัปยืนยันการลบพนักงานช่าง ─── */}
      {showBarberConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ ...modalIconContainer, backgroundColor: '#eef2f5', color: '#4a5568', border: '1px solid #e2e8f0' }}>👤</div>
            <h3 style={modalTitleText}>แน่ใจใช่ไหมที่จะลบพนักงาน?</h3>
            <p style={modalBodyText}>
              คุณต้องการลบข้อมูลพนักงานช่าง <strong style={{ color: '#004a99' }}>ช่าง {targetBarber?.name}</strong> ออกจากฐานข้อมูลระบบใช่หรือไม่?
            </p>
            <div style={modalActionGroup}>
              <button onClick={confirmDeleteBarber} style={modalConfirmBtn}>ยืนยันลบพนักงาน</button>
              <button onClick={() => { setShowBarberConfirm(false); setTargetBarber(null); }} style={modalCancelBtn}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 🔔 4. หน้าต่างป๊อปอัปแจ้งเตือนข้อมูลไม่ครบ สไตล์ Modern ─── */}
      {showAlert && (
        <div style={modalOverlay}>
          <div style={{...modalBox, borderTop: '5px solid #004a99'}}>
            <div style={{...modalIconContainer, backgroundColor: '#ebf8ff', color: '#004a99', border: '1px solid #bee3f8'}}>💡</div>
            <h3 style={modalTitleText}>ระบบแจ้งเตือน</h3>
            <p style={{...modalBodyText, fontWeight: '500', padding: '10px 0'}}>{alertMessage}</p>
            <div style={{width: '100%', marginTop: '15px'}}>
              <button onClick={() => setShowAlert(false)} style={{...modalConfirmBtn, backgroundColor: '#004a99', width: '100%'}}>ตกลง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 🎨 CSS Styles ---
const statCard = { background: 'white', padding: '20px', borderRadius: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7' };
const adminPanelBox = { background: 'white', padding: '25px', borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #edf2f7', display: 'flex', flexDirection: 'column' };
const panelTitleStyle = { margin: '0 0 15px 0', color: '#002d5a', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #f7fafc', paddingBottom: '8px' };

const modernCardStyle = {
  background: 'white',
  padding: '25px',
  borderRadius: '18px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  border: '1px solid #edf2f7',
  display: 'flex',
  flexDirection: 'column'
};

const iconBadge = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  backgroundColor: '#ebf8ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  color: '#004a99'
};

const avatarUploadContainer = {
  position: 'relative',
  width: '82px',
  height: '82px',
  borderRadius: '50%',
  cursor: 'pointer',
  border: '2px dashed #cbd5e0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  backgroundColor: '#f8fafc',
  transition: 'border 0.2s'
};

const emptyAvatarStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
};

const previewImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const cameraIconBadge = {
  position: 'absolute',
  bottom: '3px',
  right: '3px',
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  backgroundColor: '#004a99',
  color: 'white',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
};

const inputLabel = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#4a5568',
  marginBottom: '5px'
};

const modernInput = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e0',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#f8fafc',
  color: '#2d3748'
};

const modernSubmitBtn = {
  padding: '12px 20px',
  background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  marginTop: '16px',
  width: '100%',
  boxShadow: '0 4px 12px rgba(46, 204, 113, 0.25)'
};

const primaryActionBtn = { padding: '10px 18px', background: '#004a99', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 12px rgba(0, 74, 153, 0.2)' };

const thStyle = { padding: '14px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' };
const tdStyle = { padding: '14px', textAlign: 'center', fontSize: '14px', verticalAlign: 'middle' };
const badgeStyle = { fontSize: '10px', color: 'white', backgroundColor: '#e53e3e', borderRadius: '20px', padding: '2px 8px', marginTop: '4px', fontWeight: 'bold', display: 'inline-block' };

const btnStart = { backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(229, 62, 62, 0.2)' };
const btnFinish = { backgroundColor: '#38a169', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(56, 161, 105, 0.2)' };
const btnDel = { backgroundColor: '#fff', color: '#718096', border: '1px solid #e2e8f0', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };
const filterBtn = { border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };

const miniTableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: 'white' };
const miniThStyle = { background: '#f7fafc', color: '#4a5568', padding: '10px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #edf2f7' };
const miniTdStyle = { padding: '10px', textAlign: 'center', verticalAlign: 'middle', color: '#2d3748' };
const trHoverStyle = { borderBottom: '1px solid #edf2f5' };
const deleteIconButton = { backgroundColor: '#fff', color: '#e53e3e', border: '1px solid #fed7d7', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(229, 62, 62, 0.05)' };
const miniAvatarStyle = { width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '1px solid #edf2f7' };
const shopBadgeStyle = { background: '#ebf8ff', color: '#2b6cb0', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #bee3f8' };

const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26, 32, 44, 0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalBox = { backgroundColor: 'white', padding: '35px 30px', borderRadius: '20px', textAlign: 'center', width: '370px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #edf2f7' };
const modalIconContainer = { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fff5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', marginBottom: '15px', color: '#e53e3e', border: '1px solid #fed7d7' };
const modalTitleText = { margin: '0 0 10px 0', color: '#2d3748', fontSize: '20px', fontWeight: 'bold' };
const modalBodyText = { margin: '0', color: '#4a5568', fontSize: '14px', lineHeight: '1.6' };
const modalActionGroup = { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '25px', width: '100%' };
const modalConfirmBtn = { flex: 1, backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 12px rgba(229, 62, 62, 0.2)' };
const modalCancelBtn = { flex: 1, backgroundColor: '#edf2f7', color: '#4a5568', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };

export default AdminPage;