const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'garment_tracking',
  password: 'admin',
  port: 5432,
});

async function run() {
  await client.connect();
  try {
      const u1 = await client.query("UPDATE orders SET current_stage = 'Design' WHERE current_stage IN ('Design ready', 'Design & Cut Pieces Ready')");
      const u2 = await client.query("UPDATE orders SET current_stage = 'Cutting' WHERE current_stage IN ('Cut pieces ready')");
      
      const u3 = await client.query("UPDATE order_stages SET stage_name = 'Design' WHERE stage_name IN ('Design ready', 'Design & Cut Pieces Ready')");
      const u4 = await client.query("UPDATE order_stages SET stage_name = 'Cutting' WHERE stage_name IN ('Cut pieces ready')");

      console.log(`Migrated orders: ${u1.rowCount} Design, ${u2.rowCount} Cutting`);
      console.log(`Migrated order_stages: ${u3.rowCount} Design, ${u4.rowCount} Cutting`);
  } catch (e) {
      console.error(e);
  } finally {
      await client.end();
  }
}
run();
