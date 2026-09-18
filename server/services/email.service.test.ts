import { describe, it, expect } from 'vitest';
import {
  generateMinutesEmailTemplate,
  generateMinutesEmailText,
  validateEmails,
} from './email.service';

describe('Email Service', () => {
  const mockMinutesData = {
    title: 'Board Meeting - January 2026',
    date: '2026-01-23',
    attendees: ['John Doe', 'Jane Smith', 'Bob Johnson'],
    content: 'Meeting discussion about Q1 governance initiatives...',
    actionItems: [
      {
        description: 'Review compliance documents',
        assignee: 'John Doe',
        dueDate: '2026-02-15',
        status: 'open',
      },
      {
        description: 'Update board policies',
        assignee: 'Jane Smith',
        dueDate: '2026-02-20',
        status: 'inProgress',
      },
    ],
    speakers: [
      { name: 'John Doe', speakTime: 300 },
      { name: 'Jane Smith', speakTime: 450 },
    ],
  };

  describe('generateMinutesEmailTemplate', () => {
    it('generates valid HTML email template', () => {
      const html = generateMinutesEmailTemplate(mockMinutesData, 'Test User');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('NurtGov');
      expect(html).toContain(mockMinutesData.title);
      expect(html).toContain(mockMinutesData.content);
    });

    it('includes all attendees in template', () => {
      const html = generateMinutesEmailTemplate(mockMinutesData, 'Test User');

      mockMinutesData.attendees.forEach((attendee) => {
        expect(html).toContain(attendee);
      });
    });

    it('includes action items in template', () => {
      const html = generateMinutesEmailTemplate(mockMinutesData, 'Test User');

      mockMinutesData.actionItems.forEach((item) => {
        expect(html).toContain(item.description);
        expect(html).toContain(item.assignee);
      });
    });

    it('includes speaker statistics in template', () => {
      const html = generateMinutesEmailTemplate(mockMinutesData, 'Test User');

      mockMinutesData.speakers.forEach((speaker) => {
        expect(html).toContain(speaker.name);
      });
    });

    it('includes sender name in template', () => {
      const senderName = 'John Administrator';
      const html = generateMinutesEmailTemplate(mockMinutesData, senderName);

      expect(html).toContain(senderName);
    });

    it('handles missing action items', () => {
      const dataWithoutActionItems = {
        ...mockMinutesData,
        actionItems: [],
      };

      const html = generateMinutesEmailTemplate(
        dataWithoutActionItems,
        'Test User'
      );

      expect(html).toContain('NurtGov');
      expect(html).toContain(mockMinutesData.title);
    });

    it('handles missing speakers', () => {
      const dataWithoutSpeakers = {
        ...mockMinutesData,
        speakers: undefined,
      };

      const html = generateMinutesEmailTemplate(
        dataWithoutSpeakers,
        'Test User'
      );

      expect(html).toContain('NurtGov');
      expect(html).toContain(mockMinutesData.title);
    });
  });

  describe('generateMinutesEmailText', () => {
    it('generates valid text email content', () => {
      const text = generateMinutesEmailText(mockMinutesData);

      expect(text).toContain('NURTGOV');
      expect(text).toContain('Meeting Minutes');
      expect(text).toContain(mockMinutesData.title);
      expect(text).toContain(mockMinutesData.content);
    });

    it('includes all attendees in text', () => {
      const text = generateMinutesEmailText(mockMinutesData);

      mockMinutesData.attendees.forEach((attendee) => {
        expect(text).toContain(attendee);
      });
    });

    it('includes action items in text', () => {
      const text = generateMinutesEmailText(mockMinutesData);

      mockMinutesData.actionItems.forEach((item) => {
        expect(text).toContain(item.description);
        expect(text).toContain(item.assignee);
      });
    });

    it('includes speaker statistics in text', () => {
      const text = generateMinutesEmailText(mockMinutesData);

      mockMinutesData.speakers.forEach((speaker) => {
        expect(text).toContain(speaker.name);
      });
    });

    it('handles missing action items', () => {
      const dataWithoutActionItems = {
        ...mockMinutesData,
        actionItems: [],
      };

      const text = generateMinutesEmailText(dataWithoutActionItems);

      expect(text).toContain('NURTGOV');
      expect(text).toContain(mockMinutesData.title);
    });

    it('handles missing speakers', () => {
      const dataWithoutSpeakers = {
        ...mockMinutesData,
        speakers: undefined,
      };

      const text = generateMinutesEmailText(dataWithoutSpeakers);

      expect(text).toContain('NURTGOV');
      expect(text).toContain(mockMinutesData.title);
    });
  });

  describe('validateEmails', () => {
    it('validates correct email addresses', () => {
      const emails = ['john@example.com', 'jane@example.com'];
      const result = validateEmails(emails);

      expect(result.valid).toEqual(emails);
      expect(result.invalid).toEqual([]);
    });

    it('identifies invalid email addresses', () => {
      const emails = ['john@example.com', 'invalid-email', 'jane@example.com'];
      const result = validateEmails(emails);

      expect(result.valid).toContain('john@example.com');
      expect(result.valid).toContain('jane@example.com');
      expect(result.invalid).toContain('invalid-email');
    });

    it('handles empty email list', () => {
      const result = validateEmails([]);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('rejects emails without domain', () => {
      const emails = ['john@', '@example.com', 'john'];
      const result = validateEmails(emails);

      expect(result.valid).toEqual([]);
      expect(result.invalid.length).toBe(3);
    });

    it('accepts emails with subdomains', () => {
      const emails = ['john@mail.example.com', 'jane@subdomain.example.co.uk'];
      const result = validateEmails(emails);

      expect(result.valid).toEqual(emails);
      expect(result.invalid).toEqual([]);
    });

    it('rejects emails with spaces', () => {
      const emails = ['john doe@example.com', 'jane @example.com'];
      const result = validateEmails(emails);

      expect(result.valid).toEqual([]);
      expect(result.invalid.length).toBe(2);
    });
  });
});
