const net = require('net');

const client = new net.Socket();
const host = 'aws-1-ap-south-1.pooler.supabase.com';
const port = 5432;

client.connect(port, host, function() {
    console.log('Connected directly to ' + host + ':' + port);
    client.destroy();
});

client.on('error', function(err) {
    console.error('Connection failed:', err.message);
});
