import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCalendarEventsService = vi.hoisted(() => vi.fn());

vi.mock('./calendar-events.service.js', () => ({
  getCalendarEvents: getCalendarEventsService,
}));

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('calendar events controller queries', () => {
  beforeEach(() => {
    getCalendarEventsService.mockReset();
  });

  it('does not apply the default current-year range when all is true', async () => {
    getCalendarEventsService.mockResolvedValueOnce([{ id: 'event-1', title: 'Old holiday' }]);

    const { getCalendarEvents } = await import('./calendar-events.controller.js');
    const req = {
      query: { all: 'true' },
      user: { role_id: 'role-1' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await getCalendarEvents(req, res, next);

    expect(getCalendarEventsService).toHaveBeenCalledWith({
      from: undefined,
      to: undefined,
      type: undefined,
      visibility: undefined,
      search: undefined,
      sort: 'date',
      order: 'asc',
      roleId: 'role-1',
      employeeId: undefined,
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 'event-1', title: 'Old holiday' }],
    });
  });
});
