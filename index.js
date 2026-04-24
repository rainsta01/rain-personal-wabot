const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const P = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ['BotWA', 'Chrome', '1.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\nSCAN QR INI:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('BOT SUDAH ONLINE');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log('koneksi putus | menghubungkan ulang:', shouldReconnect);

            if (shouldReconnect) {
                setTimeout(() => startBot(), 5000);
            } else {
                console.log('Logout permanen. Hapus auth_info dan login ulang.');
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (!text) return;

        console.log('Pesan Masuk:', text);

        if (text.toLowerCase() === 'halo') {
            await sock.sendMessage(from, { text: 'Halo juga' });
        }

        if (text.toLowerCase() === 'menu') {
            await sock.sendMessage(from, {
                text: 'Menu:\n- halo\n- menu\n- jam'
            });
        }

        if (text.toLowerCase() === 'jam') {
            await sock.sendMessage(from, {
                text: new Date().toLocaleString()
            });
        }
    });
}

startBot();