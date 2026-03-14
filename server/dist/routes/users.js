"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUsersRouter = createUsersRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const validation_1 = require("../../../shared/validation");
const userService = __importStar(require("../services/user-service"));
const orderService = __importStar(require("../services/order-service"));
function createUsersRouter() {
    const router = (0, express_1.Router)();
    // List all users
    router.get('/', (_req, res) => {
        res.json(userService.getAllUsers());
    });
    // Get user by id
    router.get('/:id', (req, res) => {
        const user = userService.getUserById(req.params.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(user);
    });
    // Create user
    router.post('/', (req, res) => {
        const { address, display_name, role } = req.body;
        if (!address || !display_name || !role) {
            res.status(400).json({ error: 'address, display_name, and role are required' });
            return;
        }
        const user = userService.createUser(address, display_name, role);
        res.status(201).json(user);
    });
    // Update user
    router.patch('/:id', (0, validate_1.validate)(validation_1.updateUserSchema), (req, res) => {
        const user = userService.updateUser(req.params.id, req.body);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(user);
    });
    // Mock verification: submit verification (image not stored; we accept and mark verified)
    router.post('/:id/verify', auth_1.requireAuth, (req, res) => {
        if (req.params.id !== req.userId) {
            res.status(403).json({ error: 'Can only verify your own account' });
            return;
        }
        const user = userService.approveVerification(req.params.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(user);
    });
    // Get user's vouchers
    router.get('/:id/vouchers', (req, res) => {
        res.json(orderService.getVouchersByOwner(req.params.id));
    });
    // Get user's orders
    router.get('/:id/orders', (req, res) => {
        res.json(orderService.getOrders({ creator_id: req.params.id }));
    });
    return router;
}
//# sourceMappingURL=users.js.map