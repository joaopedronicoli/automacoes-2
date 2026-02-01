import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { AutomationLog } from '../../entities/automation-log.entity';
import { SocialAccount } from '../../entities/social-account.entity';
import { Repository } from 'typeorm';

describe('StatsService', () => {
    let service: StatsService;
    let postsRepo: Repository<Post>;
    let logsRepo: Repository<AutomationLog>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StatsService,
                {
                    provide: getRepositoryToken(Post),
                    useValue: { createQueryBuilder: jest.fn() },
                },
                {
                    provide: getRepositoryToken(AutomationLog),
                    useValue: { count: jest.fn(), find: jest.fn() },
                },
                {
                    provide: getRepositoryToken(SocialAccount),
                    useValue: { find: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<StatsService>(StatsService);
        postsRepo = module.get(getRepositoryToken(Post));
        logsRepo = module.get(getRepositoryToken(AutomationLog));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return dashboard stats', async () => {
        const qb = {
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ totalComments: 10, totalLikes: 50 }),
        };
        jest.spyOn(postsRepo, 'createQueryBuilder').mockReturnValue(qb as any);
        jest.spyOn(logsRepo, 'count').mockResolvedValueOnce(100).mockResolvedValueOnce(90); // Total, Success

        const result = await service.getDashboardStats('user-1');

        expect(result.totalComments).toBe(10);
        expect(result.totalLikes).toBe(50);
        expect(result.automationsRun).toBe(100);
        expect(result.successRate).toBe(90);
    });
});
