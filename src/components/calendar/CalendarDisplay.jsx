import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const platformColors = {
  Instagram: 'bg-pink-100 text-pink-700',
  Facebook: 'bg-blue-100 text-blue-700',
  TikTok: 'bg-slate-100 text-slate-700',
  Pinterest: 'bg-red-100 text-red-700',
  LinkedIn: 'bg-indigo-100 text-indigo-700',
};

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CalendarDisplay({ calendar }) {
  if (!calendar) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">
          No calendar data to display.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Calendar Preview</CardTitle>
        <CardDescription>Review the AI-generated content schedule for the month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {calendar.weeks.map((week, weekIndex) => (
          <div key={weekIndex}>
            <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-3">
              Week {week.week_number}
            </h3>
            <div className="space-y-2">
              {week.days.map((day, dayIndex) => {
                if (!day.posts || day.posts.length === 0) return null;
                return (
                  <div key={dayIndex} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {weekdays[day.day_of_week]}, {day.date}
                      </p>
                      {day.is_holiday && <Badge variant="outline" className="text-xs">Holiday</Badge>}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {day.posts.map((post, postIndex) => (
                        <div key={postIndex} className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{post.title}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${platformColors[post.primary_platform] || 'bg-slate-100 text-slate-600'}`}>
                                {post.primary_platform}
                              </span>
                              {post.format && (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">{post.format}</span>
                              )}
                            </div>
                          </div>
                          {post.caption_idea && (
                            <p className="text-sm text-slate-600 leading-relaxed">{post.caption_idea}</p>
                          )}
                          {post.hashtags?.length > 0 && (
                            <p className="text-xs text-blue-500 mt-2">{post.hashtags.slice(0, 5).join(' ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}