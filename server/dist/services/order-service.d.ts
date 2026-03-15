import { Order, FutureVoucher } from '../../../shared/types';
export interface OrderFilters {
    crop_type?: string;
    type?: string;
    status?: string;
    delivery_date?: string;
    delivery_month?: string;
    creator_id?: string;
    filled_by?: string;
}
export declare function getOrders(filters?: OrderFilters): Order[];
export declare function getOrderById(id: string): Order | undefined;
export declare function createOrder(creatorId: string, data: {
    crop_type: string;
    type: string;
    price: number;
    quantity: number;
    delivery_date: string;
}): {
    order?: Order;
    error?: string;
};
export declare function fillOrder(userId: string, orderId: string): {
    order?: Order;
    voucher?: FutureVoucher;
    error?: string;
};
export declare function cancelOrder(userId: string, orderId: string): {
    order?: Order;
    error?: string;
};
export declare function fundEscrow(userId: string, orderId: string): {
    order?: Order;
    error?: string;
};
export declare function attestDelivery(userId: string, orderId: string): {
    order?: Order;
    error?: string;
};
export declare function confirmReceipt(userId: string, orderId: string): {
    order?: Order;
    error?: string;
};
export declare function contestDelivery(userId: string, orderId: string): {
    order?: Order;
    error?: string;
};
/** Platform resolves dispute: release to seller or (for dev) leave contested for manual refund. */
export declare function resolveDispute(orderId: string, resolution: 'release' | 'refund'): {
    order?: Order;
    error?: string;
};
export declare function getVoucherById(id: string): FutureVoucher | undefined;
export declare function getVouchersByOwner(ownerId: string): FutureVoucher[];
export declare function listVoucher(ownerId: string, voucherId: string, listedPrice: number): {
    voucher?: FutureVoucher;
    error?: string;
};
export declare function buyVoucher(buyerId: string, voucherId: string): {
    voucher?: FutureVoucher;
    error?: string;
};
export declare function getListedVouchers(): FutureVoucher[];
//# sourceMappingURL=order-service.d.ts.map