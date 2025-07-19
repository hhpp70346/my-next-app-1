import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "A1"
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    const connection = await mysql.createConnection(dbConfig);

    if (action === 'getUsers') {
      const [rows] = await connection.execute("SELECT * FROM users");
      const users = rows.map(row => ({
        ...row,
        isActive: row.isActive ? '1' : '0'
      }));
      
      return NextResponse.json(users);
    }

    if (action === 'getUserPermissions') {
      const id = searchParams.get('id');
      
      // Get user permissions from user_permissions table
      const [permissionRows] = await connection.execute(
        "SELECT permission FROM user_permissions WHERE user_id = ?",
        [id]
      );
      
      const permissions = permissionRows.map(row => row.permission);
      
      return NextResponse.json({ permissions });
    }

    connection.end();
    return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const data = await request.json();
  const action = data.action;

  try {
    const connection = await mysql.createConnection(dbConfig);

    if (action === 'updatePermissions') {
      const { userId, permissions } = data;
      
      // First delete all existing permissions for this user
      await connection.execute(
        "DELETE FROM user_permissions WHERE user_id = ?",
        [userId]
      );
      
      // Then insert new permissions
      if (permissions.length > 0) {
        const values = permissions.map(permission => [userId, permission]);
        await connection.query(
          "INSERT INTO user_permissions (user_id, permission) VALUES ?",
          [values]
        );
      }
      
      return NextResponse.json(
        { status: 'success', message: 'تم تحديث الصلاحيات بنجاح' }
      );
    }

    connection.end();
    return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}