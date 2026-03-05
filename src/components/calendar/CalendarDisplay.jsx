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
      <CardContent className="space-y-6">
        {calendar.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="border-b pb-5 last:border-b-0 last:pb-0">
            <h3 className="font-semibold text-base text-slate-700 mb-3">Week {week.week_number}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {week.days.map((day, dayIndex) => (
                <div key={dayIndex} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600">{weekdays[day.day_of_week]}, {day.date}</p>
                    {day.is_holiday && <Badge variant="outline" className="text-xs">Holiday</Badge>}
                  </div>
                  {day.posts.length > 0 ? (
                    <div className="space-y-2">
                      {day.posts.map((post, postIndex) => (
                        <div key={postIndex} className="border-l-2 border-blue-500 pl-2 bg-white rounded-r-md p-2">
                          <p className="text-xs font-semibold text-slate-800 leading-tight">{post.title}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${platformColors[post.primary_platform] || 'bg-slate-100 text-slate-600'}`}>
                              {post.primary_platform}
                            </span>
                            <span className="text-xs text-slate-400">{post.format}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{post.caption_idea}</p>
                          {post.hashtags?.length > 0 && (
                            <p className="text-xs text-blue-400 mt-1 truncate">{post.hashtags.slice(0, 3).join(' ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No posts scheduled</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}