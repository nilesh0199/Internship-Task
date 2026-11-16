/**
 * Base contract for all email providers (Demo, Gmail, Outlook)
 * @abstract
 */
export class EmailProviderAdapter {
  constructor(account = null) {
    this.account = account;
  }

  /**
   * Initializes credentials and validates connection
   * @param {Object} credentials
   * @returns {Promise<boolean>}
   */
  async connect(credentials) {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Synchronizes recent threads and messages
   * @param {Object} [options]
   * @param {Date|null} [options.since=null]
   * @param {number} [options.limit=30]
   * @returns {Promise<{ threads: Array<Object>, messagesCount: number }>}
   */
  async sync({ since = null, limit = 30 } = {}) {
    throw new Error('sync() must be implemented by subclass');
  }

  /**
   * Fetches full thread messages and headers
   * @param {string} providerThreadId
   * @returns {Promise<{ thread: Object, messages: Array<Object> }>}
   */
  async getThread(providerThreadId) {
    throw new Error('getThread() must be implemented by subclass');
  }

  /**
   * Dispatches or simulates an email reply
   * @param {Object} draft
   * @returns {Promise<{ success: boolean, messageId: string, isSimulated: boolean }>}
   */
  async sendReply(draft) {
    throw new Error('sendReply() must be implemented by subclass');
  }

  /**
   * Disconnects account session
   * @returns {Promise<boolean>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }
}
