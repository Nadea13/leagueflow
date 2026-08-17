export interface PositionOption {
    value: string;
    labelTh: string;
    labelEn: string;
    category?: 'player' | 'staff';
}

export function getPositionOptions(sport?: string | null): PositionOption[] {
    const sportKey = (sport || "").toLowerCase().trim();

    let playerPositions: PositionOption[] = [];

    if (sportKey.includes("volley")) {
        playerPositions = [
            { value: "OH", labelTh: "OH - หัวเสา (Outside Hitter)", labelEn: "OH - Outside Hitter" },
            { value: "OP", labelTh: "OP - บีหลัง (Opposite Hitter)", labelEn: "OP - Opposite Hitter" },
            { value: "MB", labelTh: "MB - บอลเร็ว (Middle Blocker)", labelEn: "MB - Middle Blocker" },
            { value: "S", labelTh: "S - ตัวเซต (Setter)", labelEn: "S - Setter" },
            { value: "L", labelTh: "L - ตัวรับอิสระ (Libero)", labelEn: "L - Libero" },
            { value: "DS", labelTh: "DS - ตัวรับบอล (Defensive Specialist)", labelEn: "DS - Defensive Specialist" },
        ];
    } else if (sportKey.includes("basket")) {
        playerPositions = [
            { value: "PG", labelTh: "PG - พอยต์การ์ด (Point Guard)", labelEn: "PG - Point Guard" },
            { value: "SG", labelTh: "SG - ชู้ตติ้งการ์ด (Shooting Guard)", labelEn: "SG - Shooting Guard" },
            { value: "SF", labelTh: "SF - สมอลฟอร์เวิร์ด (Small Forward)", labelEn: "SF - Small Forward" },
            { value: "PF", labelTh: "PF - พาวเวอร์ฟอร์เวิร์ด (Power Forward)", labelEn: "PF - Power Forward" },
            { value: "C", labelTh: "C - เซนเตอร์ (Center)", labelEn: "C - Center" },
        ];
    } else if (sportKey.includes("futsal")) {
        playerPositions = [
            { value: "GK", labelTh: "GK - ผู้รักษาประตู (Goalkeeper)", labelEn: "GK - Goalkeeper" },
            { value: "FIXO", labelTh: "FIXO - กองหลัง/ตัวรับ (Fixo)", labelEn: "FIXO - Defender" },
            { value: "ALA", labelTh: "ALA - ริมเส้น/ปีก (Ala)", labelEn: "ALA - Winger" },
            { value: "PIVO", labelTh: "PIVO - หน้าเป้า/ตัวรุก (Pivo)", labelEn: "PIVO - Pivot" },
        ];
    } else if (sportKey.includes("badminton") || sportKey.includes("tennis") || sportKey.includes("table tennis") || sportKey.includes("ping")) {
        playerPositions = [
            { value: "Singles", labelTh: "ประเภทเดี่ยว (Singles)", labelEn: "Singles" },
            { value: "Doubles", labelTh: "ประเภทคู่ (Doubles)", labelEn: "Doubles" },
            { value: "Player", labelTh: "นักกีฬา (Player)", labelEn: "Player" },
        ];
    } else if (sportKey.includes("esport") || sportKey.includes("e-sport") || sportKey.includes("game")) {
        playerPositions = [
            { value: "IGL", labelTh: "IGL - กัปตันทีม (In-Game Leader)", labelEn: "IGL - In-Game Leader" },
            { value: "Carry", labelTh: "Carry / Entry (ตัวลุย/ทำเกม)", labelEn: "Carry / Entry" },
            { value: "Support", labelTh: "Support / Flex (ตัวซัพพอร์ต)", labelEn: "Support / Flex" },
            { value: "Sub", labelTh: "Sub - ตัวสำรอง (Substitute)", labelEn: "Sub - Substitute" },
        ];
    } else {
        // Football / Soccer / Default
        playerPositions = [
            { value: "GK", labelTh: "GK - ผู้รักษาประตู (Goalkeeper)", labelEn: "GK - Goalkeeper" },
            { value: "DF", labelTh: "DF - กองหลัง (Defender)", labelEn: "DF - Defender" },
            { value: "MF", labelTh: "MF - กองกลาง (Midfielder)", labelEn: "MF - Midfielder" },
            { value: "FW", labelTh: "FW - กองหน้า (Forward)", labelEn: "FW - Forward" },
        ];
    }

    // Staff roles for EVERY sport
    const staffPositions: PositionOption[] = [
        { value: "Coach", labelTh: "ผู้ฝึกสอน / โค้ช", labelEn: "Head Coach", category: "staff" },
        { value: "Staff", labelTh: "ผู้ช่วยผู้ฝึกสอน / สตาฟฟ์", labelEn: "Assistant Coach / Staff", category: "staff" },
        { value: "Manager", labelTh: "ผู้จัดการทีม", labelEn: "Team Manager", category: "staff" },
    ];

    return [...playerPositions, ...staffPositions];
}
