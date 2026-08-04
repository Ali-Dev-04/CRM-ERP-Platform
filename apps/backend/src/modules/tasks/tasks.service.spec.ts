import { TasksService } from './tasks.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';

function mockProjects() {
  return { load: jest.fn().mockResolvedValue(undefined) } as any;
}
function mockAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}

describe('TasksService — kanban move', () => {
  let prisma: any;
  let service: TasksService;

  beforeEach(() => {
    prisma = {
      task: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    service = new TasksService(prisma, mockProjects(), mockAudit());
  });

  it('inserts the moved task at the requested index and renumbers the column', async () => {
    // Existing column (excluding moved task T1): T2(pos0), T3(pos1)
    prisma.task.findMany.mockResolvedValue([{ id: 'T2' }, { id: 'T3' }]);
    prisma.task.findFirst.mockResolvedValue({ id: 'T1', projectId: 'P1' });
    prisma.$transaction.mockResolvedValue([]);
    prisma.task.findUniqueOrThrow.mockResolvedValue({ id: 'T1', status: 'TODO', position: 0 });

    await service.move('u', 'o', 'w', 'P1', 'T1', { status: 'TODO', index: 1 });

    // prisma.task.update is called once per item in the new column order.
    const calls = prisma.task.update.mock.calls.map((c: any) => c[0]);
    expect(calls).toHaveLength(3);
    expect(calls.map((c: any) => c.data.position)).toEqual([0, 1, 2]);
    expect(calls.every((c: any) => c.data.status === 'TODO')).toBe(true);
    // After splicing T1 in at index 1, the order is T2, T1, T3.
    expect(calls.map((c: any) => c.where.id)).toEqual(['T2', 'T1', 'T3']);
  });

  it('clamps an out-of-range index to the end of the column', async () => {
    prisma.task.findMany.mockResolvedValue([{ id: 'T2' }, { id: 'T3' }]);
    prisma.task.findFirst.mockResolvedValue({ id: 'T1', projectId: 'P1' });
    prisma.$transaction.mockResolvedValue([]);
    prisma.task.findUniqueOrThrow.mockResolvedValue({ id: 'T1', status: 'TODO', position: 2 });

    await service.move('u', 'o', 'w', 'P1', 'T1', { status: 'TODO', index: 99 });
    const calls = prisma.task.update.mock.calls.map((c: any) => c[0]);
    expect(calls.at(-1).where.id).toBe('T1'); // appended at the end
  });

  it('throws NotFound when the task is missing', async () => {
    prisma.task.findFirst.mockResolvedValue(null);
    await expect(service.move('u', 'o', 'w', 'P1', 'missing', { status: 'TODO', index: 0 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
