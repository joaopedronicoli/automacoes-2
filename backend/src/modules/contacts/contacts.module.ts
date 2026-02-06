import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../../entities/contact.entity';
import { ContactInteraction } from '../../entities/contact-interaction.entity';
import { ContactTag } from '../../entities/contact-tag.entity';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Contact, ContactInteraction, ContactTag]),
        forwardRef(() => FacebookModule),
        SocialAccountsModule,
    ],
    controllers: [ContactsController],
    providers: [ContactsService],
    exports: [ContactsService],
})
export class ContactsModule {}
