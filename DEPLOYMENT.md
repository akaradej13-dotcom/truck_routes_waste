# 🚀 คู่มือการนำระบบขึ้นใช้งานจริง (Production Deployment Guide)

คู่มือนี้สำหรับแนะนำขั้นตอนการติดตั้งระบบ **Recycle Route Optimizer** ขึ้นสู่ระบบคลาวด์และเชื่อมต่อกับ LINE Developers เพื่อใช้งานหน้าจอคนขับแบบ LIFF อย่างเป็นทางการ

---

## 📁 ส่วนที่ 1: การโฮสต์เว็บแอปพลิเคชันและฐานข้อมูล (Next.js & PostgreSQL)

### 1.1 การสร้างฐานข้อมูล PostgreSQL (แนะนำ: Neon.tech หรือ Supabase)
1. สมัครสมาชิกเว็บ [Neon.tech](https://neon.tech/) (ฟรี)
2. สร้างโปรเจกต์และฐานข้อมูลใหม่ เลือก Region สหรัฐอเมริกาตะวันออกหรือสิงคโปร์ (สิงคโปร์จะเร็วที่สุดสำหรับผู้ใช้ในไทย)
3. คัดลอก **Connection String** ที่มีรูปแบบดังนี้:
   ```env
   postgres://username:password@ep-xxxxxx.singapore.aws.neon.tech/neondb?sslmode=require
   ```

### 1.2 การปรับแก้ไขไฟล์โปรเจกต์สำหรับ PostgreSQL
เมื่อต้องการนำขึ้นใช้งานจริง ให้เปลี่ยนการตั้งค่าประเภทฐานข้อมูล (Database Provider) ในโค้ด:
1. เปิดไฟล์ [schema.prisma](prisma/schema.prisma)
2. แก้ไขส่วน `datasource db` จาก `provider = "sqlite"` ให้เป็น `provider = "postgresql"`:
   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```
3. รันคำสั่งอัปเดต Client ใน Terminal ของคุณ:
   ```bash
   npx prisma generate
   ```

### 1.3 การอัปโหลดขึ้น Vercel (ฟรีรันไทม์ Next.js)
1. สมัครใช้งาน [Vercel](https://vercel.com/) และเชื่อมบัญชีเข้ากับ GitHub/GitLab
2. คลิก **Add New Project** และเลือก Repository โปรเจกต์นี้
3. ในส่วนการตั้งค่า **Environment Variables** ให้ระบุค่าสำคัญดังนี้:
   *   `DATABASE_URL`: วางลิงก์ Connection String จาก Neon.tech ที่คัดลอกมา
   *   `NEXT_PUBLIC_LIFF_ID`: ใส่รหัส LIFF ID ที่ได้มาจาก LINE (จากขั้นตอนส่วนที่ 2 ด้านล่าง)
4. กดปุ่ม **Deploy** ตัว Vercel จะเริ่มประมวลผลบิลด์และสร้างลิงก์เว็บไซต์ใช้งานจริงให้ทันที (เช่น `https://recycle-route.vercel.app`)
5. รันการ Migrate โครงสร้างฐานข้อมูลขึ้นคลาวด์โดยใช้คำสั่ง:
   ```bash
   npx prisma db push
   ```

---

## 💬 ส่วนที่ 2: การเชื่อมต่อบริการ LINE OA & LINE LIFF

เพื่อที่จะให้คนขับสามารถแอด LINE และกดเปิดงานได้ตามที่คุยกันไว้ ให้ทำตามลำดับขั้นตอนดังนี้ค่ะ:

### 2.1 สร้าง LINE Official Account (LINE OA)
1. เข้าสู่เว็บ [LINE Official Account Manager](https://manager.line.biz/)
2. กด **สร้างบัญชีทั่วไป** กรอกข้อมูลชื่อโปรเจกต์ เช่น *'Recycle Route'* 
3. เมื่อสร้างสำเร็จ ให้เข้าไปที่แท็บ **Settings (ตั้งค่า)** > **Messaging API** > กด **Enable Messaging API** 

### 2.2 ตั้งค่าใน LINE Developers Console
1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/) ล็อกอินด้วย LINE Account ของคุณ
2. คุณจะเห็น **Provider** และ **Channel** ที่สร้างไว้จากข้อ 2.1 
3. คลิกเข้าไปที่ Channel ยืนยันตัวตน (LINE Login หรือ Messaging API) แนะนำให้สร้าง **LINE Login Channel** ใหม่เพื่อความง่ายในการตรวจสอบสิทธิ์:
   *   กด **Create a new channel** > เลือก **LINE Login**
   *   กรอกรายละเอียดพื้นฐานและกดสร้าง

### 2.3 สร้างและเปิดใช้งาน LIFF App
1. คลิกเข้าไปที่ **LINE Login Channel** ที่สร้างขึ้นใหม่
2. เลือกแท็บ **LIFF** ด้านบน > กดปุ่ม **Add** เพื่อสร้าง LIFF
3. ตั้งค่ารายละเอียดดังนี้:
   *   **LIFF app name**: *Recycle Driver App*
   *   **Size**: เลือก **Tall** (ครึ่งหน้าจอค่อนไปทางสูง) หรือ **Full** (เต็มจอแชต)
   *   **Endpoint URL**: ใส่ลิงก์เว็บจริงของคุณที่ได้มาจาก Vercel โดยระบุหน้า `/driver` เช่น:
       `https://recycle-route.vercel.app/driver`
   *   **Scopes**: ติ๊กถูกที่ช่อง `profile` และ `openid`
4. กด **Save**
5. คัดลอกค่า **LIFF ID** (เช่น `2004561234-aBCdeFgh`) นำไปใส่เป็นตัวแปรแวดล้อม (`NEXT_PUBLIC_LIFF_ID`) ในโฮสติ้ง Vercel ตามขั้นตอนข้อ 1.3

### 2.4 ผูกปุ่มเข้ากับแชต LINE (Rich Menu)
1. กลับมาที่หน้าเว็บ [LINE Official Account Manager](https://manager.line.biz/) ของบัญชีบริษัทคุณ
2. เมนูด้านซ้าย เลือก **Rich menus (ริชเมนู)** > กด **Create a Rich Menu**
3. ออกแบบรูปภาพเมนูให้มีปุ่มขนาดใหญ่ เช่น เขียนว่า **"ดูงานเดินรถวันนี้"**
4. ในส่วนการตั้งค่า Action ของปุ่ม:
   *   เลือก Type: **Link**
   *   วาง URL เป็นคิวเปิดแอป LIFF ในรูปแบบ: `line://app/[LIFF_ID_ของคุณ]` (เช่น `line://app/2004561234-aBCdeFgh`)
5. กดบันทึกและเปิดใช้งาน Rich Menu

---

เมื่อคนขับกดแอดไลน์บริษัทเข้ามา พวกเขาจะเห็นแถบ Rich Menu ด้านล่างทันที เมื่อกดปุ่ม ระบบจะเปิด LINE Webview เข้าสู่หน้าคิวรับขยะ พร้อมยืนยันสิทธิ์ของคนขับท่านนั้นแบบไร้รอยต่อโดยไม่ต้องล็อกอินใหม่ค่ะ!
