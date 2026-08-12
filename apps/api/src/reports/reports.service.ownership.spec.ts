import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService ownership', () => {
  it('getReport returns NOT_FOUND when report is outside the authenticated user', async () => {
    const ensureUser = jest.fn().mockResolvedValue({
      id: 'user-a',
      clerk_id: 'clerk_a',
    });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const from = jest.fn().mockReturnValue(query);

    const service = new ReportsService(
      { db: { from } } as never,
      { ensureUser } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { invalidateUser: jest.fn() } as never,
    );

    await expect(
      service.getReport(
        {
          clerkId: 'clerk_a',
          email: 'a@example.com',
          fullName: null,
          avatarUrl: null,
        },
        '00000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(from).toHaveBeenCalledWith('health_reports');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-a');
  });
});
