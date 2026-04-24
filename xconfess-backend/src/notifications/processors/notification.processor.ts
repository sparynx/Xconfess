import { Processor, OnWorkerEvent, InjectQueue, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { EmailNotificationService } from '../services/email-notification.service';
import { NotificationType } from '../entities/notification.entity';

export const NOTIFICATION_QUEUE = 'notifications';
export const NOTIFICATION_DLQ = 'notifications-dlq';

export interface NotificationJobData {
  userId: string;
  type: string; // Unified with NotificationType or string
  title: string;
  message: string;
  metadata?: any;
  _meta?: {
    originalJobId: string | undefined;
    failedAt: string;
    attemptsMade: number;
    lastError: string;
  };
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    @InjectQueue(NOTIFICATION_DLQ)
    private readonly dlq: Queue<NotificationJobData>,
  ) {
    super();
  }

  // ------------------------------------------------------------------ process
  async process(job: Job<NotificationJobData>): Promise<void> {
    if (job.name === 'send-notification') {
      this.logger.log(
        `Processing notification job ${job.id} (attempt ${job.attemptsMade + 1})` +
          ` → userId: ${job.data.userId}`,
      );

      await this.emailNotificationService.sendEmail(job.data);
    }
  }

  // --------------------------------------------------------------- on:failed
  /**
   * Called after every failed attempt.
   * When all attempts are exhausted BullMQ marks the job "failed" — we then
   * copy the full payload + error context into the dead-letter queue.
   */
  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<NotificationJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) return;

    const maxAttempts = (job.opts as any)?.attempts ?? 1;

    this.logger.warn(
      `Job ${job.id} failed (attempt ${job.attemptsMade}/${maxAttempts}): ${error.message}`,
    );

    const isExhausted = job.attemptsMade >= maxAttempts;

    if (isExhausted) {
      this.logger.error(
        `Job ${job.id} exhausted all retries — moving to DLQ`,
        error.stack,
      );

      await this.dlq.add(
        'dead-letter',
        {
          ...job.data,
          _meta: {
            originalJobId: String(job.id),
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade,
            lastError: error.message,
          },
        },
        {
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    }
  }

  // -------------------------------------------------------------- on:completed
  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationJobData> | undefined): void {
    if (job) {
      this.logger.log(`Job ${job.id} completed successfully`);
    }
  }
}
