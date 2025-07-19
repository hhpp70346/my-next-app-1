import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "A1"
};

// تعريف الأدوار باللغة العربية
const roles = {
  'admin': 'المدير العام',
  'system_admin': 'مدير النظام',
  'account_manager': 'إدارة الحسابات',
  'issue_manager': 'إدارة الإصدار',
  'general_manager': 'متابعة المدير العام',
  'revenue_review': 'مراجعة الإيرادات'
};

export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM meter_data');
    connection.end();
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const input = await request.json();
    const connection = await mysql.createConnection(dbConfig);

    if (input.action === 'deleteData') {
      // استرجاع السجل من جدول meter_data
      const [record] = await connection.execute('SELECT * FROM meter_data WHERE id = ?', [input.id]);
      
      if (record.length === 0) {
        connection.end();
        return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
      }

      // الحصول على اسم المستخدم ودوره الحالي لتسجيله كقائم بالحذف
      const userRole = roles[input.user?.role] || input.user?.role;
      const deleter = `${input.user?.username || 'غير معروف'} (${userRole || 'دور غير معروف'})`;

      // إدراج السجل في جدول deleted_meter_data
      await connection.execute(
        `INSERT INTO deleted_meter_data 
        (id, permissionNumber, requestDate, accountReference, meterNumber, balanceTo, balanceDebtor, meterStatus, 
         faultType, faultNotes, intentional, billNotice, averageQuantity, basePeriodFrom, basePeriodTo, 
         faultPeriodFrom, faultPeriodTo, settlementQuantity, totalSettlement, paidDiscount, installments, 
         executionNotes, success, added_by, updated_by, deleted_by, branch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record[0].id,
          record[0].permissionNumber,
          record[0].requestDate,
          record[0].accountReference,
          record[0].meterNumber,
          record[0].balanceTo,
          record[0].balanceDebtor,
          record[0].meterStatus,
          record[0].faultType,
          record[0].faultNotes,
          record[0].intentional,
          record[0].billNotice,
          record[0].averageQuantity,
          record[0].basePeriodFrom,
          record[0].basePeriodTo,
          record[0].faultPeriodFrom,
          record[0].faultPeriodTo,
          record[0].settlementQuantity,
          record[0].totalSettlement,
          record[0].paidDiscount,
          record[0].installments,
          record[0].executionNotes,
          record[0].success,
          record[0].added_by,
          record[0].updated_by || null,
          deleter,
          record[0].branch
        ]
      );

      // حذف السجل من جدول meter_data
      await connection.execute('DELETE FROM meter_data WHERE id = ?', [input.id]);
      connection.end();

      return NextResponse.json({ 
        status: 'success', 
        message: 'تم حذف السجل وتسجيله في سجل المحذوفات بنجاح' 
      });
    }

    connection.end();
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}