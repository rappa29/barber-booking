import React, { useState, useEffect } from 'react'; 
import 'react-calendar/dist/Calendar.css';
import OneSignal from 'react-onesignal'; 

// --- Import หน้าแยก ---
import AdminPage from './AdminPage'; 
import CustomerPage from './CustomerPage';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const mySecretPassword = "2948"; 

  // --- 🔔 ระบบแจ้งเตือน OneSignal เมื่อเปิดแอปครั้งแรก ---
  useEffect(() => {
    OneSignal.init({ 
      appId: "a92430bb-cb81-4566-bbb2-051f0544895d", 
      allowLocalhostAsSecureOrigin: true 
    }).then(() => {
      OneSignal.Slidedown.promptHttpPermission();
    });
  }, []);

  const handleLogin = () => {
    if (passInput === mySecretPassword) { 
      setIsAdmin(true); 
      setShowLogin(false); 
      setPassInput(''); 
    } else { 
      alert("รหัสผ่านไม่ถูกต้อง!"); 
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#f4f7fa' }}>
      
      {/* ปุ่มสำหรับช่าง / ออกจากระบบ */}
      <div style={topNavStyle}>
        {!isAdmin ? (
          <button onClick={() => setShowLogin(true)} style={adminBtnStyle}>🔑 สำหรับช่าง</button>
        ) : (
          <button onClick={() => setIsAdmin(false)} style={logoutBtnStyle}>🚪 ออกจากโหมดช่าง</button>
        )}
      </div>

      {/* สลับหน้าจอระหว่าง Admin และ Customer */}
      {isAdmin ? (
        <AdminPage /> 
      ) : (
        <CustomerPage />
      )}

      {/* Modal เข้าสู่ระบบช่าง (แก้ไขให้กด Enter ได้ 100%) */}
      {showLogin && (
        <div style={modalOverlay}>
          <div style={loginModalStyle}>
            <h3 style={{ color: '#002d5a', marginBottom: '15px' }}>เข้าสู่ระบบช่างภรภัทร</h3>
            <input 
              type="password" 
              value={passInput} 
              onChange={(e) => setPassInput(e.target.value)} 
              placeholder="รหัสลับ" 
              style={inputStyle} 
              autoFocus // ให้เคอร์เซอร์กระพริบพร้อมพิมพ์ทันทีเมื่อเปิด
              // 💡 เพิ่มคำสั่งดักจับปุ่ม Enter ตรงนี้
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                  e.preventDefault();
                  handleLogin();
                }
              }}
            />
            <button onClick={handleLogin} style={{...buttonStyle, marginTop:'15px'}}>ยืนยัน</button>
            <button onClick={() => { setShowLogin(false); setPassInput(''); }} style={{...buttonStyle, backgroundColor:'#ccc', marginTop:'5px'}}>ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CSS Styles ---
const topNavStyle = { position: 'absolute', top: '20px', right: '20px', zIndex: 100 };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '12px', backgroundColor: '#004a99', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const adminBtnStyle = { backgroundColor: 'white', color: '#004a99', border: '1px solid #004a99', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const logoutBtnStyle = { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const loginModalStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '280px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };

export default App;