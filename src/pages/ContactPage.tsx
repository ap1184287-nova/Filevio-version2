import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { usePageSeo } from '../utils/seo';

export function ContactPage() {
  usePageSeo({
    title: 'Contact — FILEVIO',
    description:
      'Get in touch with the FILEVIO team for product feedback, bug reports, or document tool support.',
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('General Question');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please enter a message of at least 10 characters.');
      return;
    }

    setSubmitted(true);
  };

  const mailtoHref = `mailto:support@filevio.app?subject=${encodeURIComponent(
    `[FILEVIO] ${topic}`,
  )}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`;

  return (
    <div className="bg-white py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Contact FILEVIO
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Have a question about a specific PDF tool, browser compatibility, or feature request? Send us a note below.
          </p>
        </div>

        {submitted ? (
          <div
            role="status"
            className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Message Prepared
                </h2>
                <p className="text-sm text-slate-700">
                  Thank you, {name}. Because FILEVIO operates as a static privacy-first web app without a tracking backend, you can dispatch your message directly through your email client below or reset the form.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                Open in Email App
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setMessage('');
                }}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-white space-y-5"
          >
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact-topic"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Topic
              </label>
              <select
                id="contact-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="General Question">General Question</option>
                <option value="Tool Feedback">Tool Feedback</option>
                <option value="Bug Report">Bug Report</option>
                <option value="Privacy Inquiry">Privacy Inquiry</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question or feedback..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                Submit Inquiry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
