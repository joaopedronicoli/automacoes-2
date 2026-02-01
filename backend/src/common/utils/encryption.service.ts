import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
    private readonly encryptionKey: string;

    constructor(private configService: ConfigService) {
        this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

        if (!this.encryptionKey || this.encryptionKey.length < 32) {
            throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
        }
    }

    encrypt(text: string): string {
        if (!text) return text;

        try {
            const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    decrypt(encryptedText: string): string {
        if (!encryptedText) return encryptedText;

        try {
            const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
}
