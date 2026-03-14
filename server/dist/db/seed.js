"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("./connection"));
// No default users: all users are created via Reown sign-in.
// Seed only clears and leaves DB empty (or you can add demo orders after creating users in-app).
function seed() {
    const run = connection_1.default.transaction(() => {
        connection_1.default.exec('DELETE FROM vouchers');
        connection_1.default.exec('DELETE FROM orders');
        connection_1.default.exec('DELETE FROM users');
    });
    run();
    console.log('Seeded: database cleared. Sign in with Reown to create your user.');
}
seed();
//# sourceMappingURL=seed.js.map