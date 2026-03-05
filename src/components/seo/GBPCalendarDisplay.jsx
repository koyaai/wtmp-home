import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const POST_TYPE_COLORS = {
    "Offer": "bg-amber-100 text-amber-700",
    "What's New": "bg-blue-100 text-blue-700",
    "Event": "bg-violet-100 text-violet-700",
    "Product": "bg-emerald-100 text-emerald-700",
};

export default function GBPCalendarDisplay({ calendar }) {
    if (!calendar?.weeks) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-slate-400">No GBP calendar data to display.</CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Generated GBP Calendar Preview</CardTitle>
                <CardDescription>Review the AI-generated Google Business Profile content schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {calendar.weeks.map((week, wi) => (
                    <div key={wi} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                        <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">Week {week.week_number}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {week.days.filter(d => d.posts?.length > 0).map((day, di) => (
                                <div key={di} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-slate-700">{WEEKDAYS[day.day_of_week]}, {day.date}</p>
                                        {day.is_holiday && <Badge variant="outline" className="text-xs">Holiday</Badge>}
                                    </div>
                                    <div className="space-y-2">
                                        {day.posts.map((post, pi) => (
                                            <div key={pi} className="border-l-2 border-blue-400 pl-2">
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${POST_TYPE_COLORS[post.type] || "bg-slate-100 text-slate-600"}`}>
                                                    {post.type}
                                                </span>
                                                <p className="text-xs text-slate-600 mt-1">{post.description_idea}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">CTA: {post.call_to_action}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {post.keywords?.map((kw, ki) => (
                                                        <span key={ki} className="text-xs bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">{kw}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}