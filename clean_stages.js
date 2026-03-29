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
      const res = await client.query("DELETE FROM stage_definitions WHERE name IN ('Design ready', 'Design & Cut Pieces Ready', 'Cut pieces ready', 'Design & Cut')");
      console.log(`Deleted legacy stages: ${res.rowCount}`);
  } catch (e) {
      console.error(e);
  } finally {
      await client.end();
  }
}
run();
