'use client'

import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTheme } from 'next-themes'
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import EditorJS from '@editorjs/editorjs'
import Header from "@editorjs/header";
import Paragraph from "@editorjs/paragraph";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import Code from "@editorjs/code";
import Image from "@editorjs/image";

const Editor = () => {
    const editor = useRef<null | EditorJS>(null);
    const [editorReady, setEditorReady] = useState(false)
    const [title, setTitle] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<null|string>(null)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const id = useSearchParams().get('id')
    const supabase = createClient()
    const { theme, setTheme } = useTheme()
    const handleSave = async () => {
        if (!editor.current || !title.trim()) return setError("Title is required");

        if (!editorReady) return setError("Editor is not ready yet");

        setSaving(true);
        setError(null);

        try {
            const {data: { user },} = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            await editor.current.isReady;
            const content = await editor.current.save();

            console.log("Saving content:", content)

            if (id) {
                const { error: updateError } = await supabase
                    .from("posts")
                    .update({
                        title,
                        excerpt,
                        content, // Don't stringify - Supabase handles JSONB
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", id)
                    .eq("user_id", user.id);

                if (updateError) throw updateError;

                alert("Post updated successfully!");
            } else {
                const { data, error: insertError } = await supabase
                    .from("posts")
                    .insert({
                        title,
                        excerpt,
                        content, // Don't stringify - Supabase handles JSONB
                        user_id: user.id,
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                console.log("Post created:", data)
                router.push("/");
            }
        } catch (error) {
            console.error("Save error:", error)
            setError(error instanceof Error ? error.message : "Failed to save post");
        } finally {
            setSaving(false);
        }
    }
    useEffect(() => {
        setMounted(true)
    }, [])
    useEffect(() => {
        let editorInstance = null;

        (async () => {
            if (editor?.current) return;

            editorInstance = new EditorJS({
                holder: "editorjs",
                tools: {
                    header: Header,
                    paragraph: Paragraph,
                    list: List,
                    quote: Quote,
                    code: Code,
                    image: {
                        class: Image,
                        config: {
                            uploader: {
                                uploadByFile: async (file: File) => {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) throw new Error("Not authenticated");

                                    const fileName = `${Date.now()}-${file.name}`;
                                    const { error: uploadError } = await supabase.storage
                                        .from("blog-images")
                                        .upload(`${user.id}/${fileName}`, file);

                                    if (uploadError) throw uploadError;

                                    const { data } = supabase.storage.from("blog-images").getPublicUrl(`${user.id}/${fileName}`);

                                    return {
                                        success: 1,
                                        file: { url: data.publicUrl, },
                                    };
                                },
                            },
                        },
                    },
                },
                onReady: () => {
                    console.log("Editor ready");
                    setEditorReady(true);
                },
            });

            editor.current = editorInstance;

            if (id) {
                const { data: post } = await supabase.from("posts").select("*").eq("id", id).single();

                if (post) {
                    setTitle(post.title);
                    setExcerpt(post.excerpt || "");

                    const content = typeof post.content === 'string'
                        ? JSON.parse(post.content)
                        : post.content;

                    await editorInstance.isReady;
                    await editorInstance.render(content);
                }
            }
        })();

        return () => {
            if (editor.current?.destroy) {
                editor.current.destroy();
                editor.current = null;
            }
        };
    }, [id, supabase]);
    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 ">
                        {id ? 'Edit Post' : 'New Post'}
                    </h1>
                    <div className="flex gap-2">
                        {mounted && (
                            <Button
                                variant={'outline'}
                                size={'icon'}
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="border-zinc-300 dark:border-zinc-700">
                                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </Button>
                        )}
                        <Link href={'/'}>
                            <Button variant='outline' className="border-zinc-300 dark:border-zinc-700">
                                Back
                            </Button>
                        </Link>
                    </div>
                </div>
                <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-4 transition-colors">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2" htmlFor="">
                            Title
                        </label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Post title..."
                            className="bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2" htmlFor="">
                            Excerpt
                        </label>
                        <Input
                            value={excerpt}
                            onChange={e => setExcerpt(e.target.value)}
                            placeholder="Brief summary..."
                            className="bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-50"
                        />
                    </div>
                    <div className="">
                        <div id="editorjs" className="max-w-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-4 min-h-96 prose lg:prose-xl
                        prose-headings:text-zinc-900 dark:prose-headings:text-zinc-50
                        prose-p:text-zinc-700 dark:prose-p:text-zinc-300
                        prose-a:text-emerald-600 dark:prose-a:text-emerald-400
                        prose-strong:text-zinc-900 dark:prose-strong:text-zinc-50
                        prose-code:text-zinc-900 dark:prose-code:text-zinc-50
                        prose-code:bg-zinc-200 dark:prose-code:bg-zinc-700
                        prose-pre:bg-zinc-900 dark:prose-pre:bg-zinc-950
                        prose-blockquote:border-emerald-500 dark:prose-blockquote:border-emerald-400
                        prose-blockquote:text-zinc-700 dark:prose-blockquote:text-zinc-300
                        prose-img:rounded-lg" />
                    </div>
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {saving ? <Spinner /> : 'Save Post'}
                        </Button>
                        <Link href={'/'}>
                            <Button variant={'outline'} className="border-zinc-300 dark:border-zinc-700">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        </main>
    )
}

export default Editor