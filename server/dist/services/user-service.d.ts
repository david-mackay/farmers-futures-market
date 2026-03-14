import { User, UserRole } from '../../../shared/types';
export declare function getUserById(id: string): User | undefined;
export declare function getUserByAddress(address: string): User | undefined;
export declare function createUser(address: string, displayName: string, role: UserRole, email?: string | null): User;
export declare function getOrCreateUser(address: string, opts?: {
    email?: string | null;
    display_name?: string;
    is_farmer?: boolean;
}): User;
export declare function updateUser(id: string, updates: {
    display_name?: string;
    role?: string;
    is_farmer?: boolean;
    is_verified?: boolean;
    verification_submitted_at?: string | null;
    delivery_address?: string | null;
    acreage?: number | null;
    crops_produced?: string | null;
}): User | undefined;
export declare function approveVerification(id: string): User | undefined;
export declare function getAllUsers(): User[];
//# sourceMappingURL=user-service.d.ts.map