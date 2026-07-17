'use server'

import { Plan, ActionResponse } from "@/types";

const ALL_PLANS: Plan[] = [
    {
        id: 'starter',
        name: 'Match',
        description: [
            "สร้างทัวร์นาเมนต์สูงสุด 1 รายการ",
            "สร้างรุ่นการแข่งขันสูงสุด 1 รุ่น",
            "จำกัดจำนวนทีมสูงสุด 12 ทีม",
            "ระบบรับเงินค่าสมัครผ่าน QR Code",
            "บันทึกเหตุการณ์สด/ผู้ทำประตู/การฟาวล์ แบบเรียลไทม์",
            "หน้าแสดงผลคะแนนสดสำหรับต่อเข้าจอถ่ายทอดสด (OBS Overlay)"
        ],
        price: 0,
        discounted_price: null,
        duration: 'lifetime',
        max_tournaments: 1,
        max_teams_per_tournament: 12,
        format_support: 'Basic',
        invite_enabled: false,
        register_enabled: true,
        stats_support: 'Basic',
        support_level: 'Community',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'pro',
        name: 'Event',
        description: [
            "สร้างทัวร์นาเมนต์ 5 รายการ",
            "สร้างรุ่นการแข่งขัน 15 รายการ",
            "จำกัดจำนวนทีมสูงสุด 32 ทีม",
            "บันทึกเหตุการณ์สด/ผู้ทำประตู/การฟาวล์ แบบเรียลไทม์",
            "เพิ่มสตาฟดูแลการแข่งขันร่วมกัน",
            "ระบบลงทะเบียนพร้อมจ่ายเงิน PromptPay",
            "หน้าแสดงผลคะแนนสดสำหรับต่อเข้าจอถ่ายทอดสด (OBS Overlay)"
        ],
        price: 790,
        discounted_price: null,
        duration: 'monthly',
        max_tournaments: 5,
        max_teams_per_tournament: 32,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'pro_yearly',
        name: 'Event Yearly',
        description: [
            "ประหยัดกว่ารายเดือน 2 เดือน!",
            "สร้างทัวร์นาเมนต์ 5 รายการ",
            "สร้างรุ่นการแข่งขัน 15 รายการ",
            "จำกัดจำนวนทีมสูงสุด 32 ทีม",
            "บันทึกเหตุการณ์สด/ผู้ทำประตู/การฟาวล์ แบบเรียลไทม์",
            "เพิ่มสตาฟดูแลการแข่งขันร่วมกัน",
            "ระบบลงทะเบียนพร้อมจ่ายเงิน PromptPay",
            "หน้าแสดงผลคะแนนสดสำหรับต่อเข้าจอถ่ายทอดสด (OBS Overlay)"
        ],
        price: 7900,
        discounted_price: null,
        duration: 'yearly',
        max_tournaments: 5,
        max_teams_per_tournament: 32,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'cup',
        name: 'Cup',
        description: [
            "สร้างทัวร์นาเมนต์ 20 รายการ",
            "สร้างรุ่นการแข่งขัน 60 รุ่น",
            "จำกัดจำนวนทีมสูงสุด 128 ทีม",
            "บันทึกเหตุการณ์สด/ผู้ทำประตู/การฟาวล์ แบบเรียลไทม์",
            "เพิ่มสตาฟดูแลการแข่งขันร่วมกัน",
            "ระบบลงทะเบียนพร้อมจ่ายเงิน PromptPay",
            "หน้าแสดงผลคะแนนสดสำหรับต่อเข้าจอถ่ายทอดสด (OBS Overlay)"
        ],
        price: 1790,
        discounted_price: null,
        duration: 'monthly',
        max_tournaments: 20,
        max_teams_per_tournament: 128,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'cup_yearly',
        name: 'Cup Yearly',
        description: [
            "สร้างทัวร์นาเมนต์ 20 รายการ",
            "สร้างรุ่นการแข่งขัน 60 รุ่น",
            "จำกัดจำนวนทีมสูงสุด 128 ทีม",
            "บันทึกเหตุการณ์สด/ผู้ทำประตู/การฟาวล์ แบบเรียลไทม์",
            "เพิ่มสตาฟดูแลการแข่งขันร่วมกัน",
            "ระบบลงทะเบียนพร้อมจ่ายเงิน PromptPay",
            "หน้าแสดงผลคะแนนสดสำหรับต่อเข้าจอถ่ายทอดสด (OBS Overlay)"
        ],
        price: 17900,
        discounted_price: null,
        duration: 'yearly',
        max_tournaments: 20,
        max_teams_per_tournament: 128,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'customs',
        name: 'Customs',
        description: [
            "สิทธิ์การเข้าใช้งานฟีเจอร์ Pro ทั้งหมด",
            "ระบบจัดการและโฆษณาสปอนเซอร์หลักอย่างเป็นทางการ",
            "ส่งออกข้อมูลนักกีฬาและสรุปผลคะแนน (Excel/CSV)",
            "ปรับแต่งหน้าทัวร์นาเมนต์และระบบด้วย Custom Domain",
            "ทีมงานดูแลให้คำแนะนำและช่วยเหลือการตั้งค่าระบบตลอดทัวร์นาเมนต์"
        ],
        price: 0,
        discounted_price: null,
        duration: 'lifetime',
        max_tournaments: 0,
        max_teams_per_tournament: 0,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'VIP',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

export async function getPlans(_options?: { role?: 'organizer' | 'manager' }): Promise<ActionResponse<Plan[]>> {
    try {
        return { success: true, data: ALL_PLANS };
    } catch (error) {
        console.error('Unexpected error in getPlans:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
