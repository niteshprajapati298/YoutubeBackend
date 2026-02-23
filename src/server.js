import { ConnectDb } from "./db/db.js";
import { app } from "./app.js";
const PORT = process.env.PORT || 8000

ConnectDb()
    .then(() => {
        const server = app.listen(PORT, () => {
            console.log(`Server is Successfully running on PORT ${PORT}`);
        })
        server.on('error', (err) => {
            console.error('Server connection error:', err);
            process.exit(1);
        })
    })
    .catch((err) => {
        console.log(err)
        throw err
    })