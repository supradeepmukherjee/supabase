'use client'

import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
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
    const [editor, setEditor] = useState<null | EditorJS>(null)
    const [title, setTitle] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const id = useSearchParams().get('id')
    const supabase = createClient()
    const { theme, setTheme } = useTheme()
    const handleSave = async () => { }
    useEffect(() => {
        setMounted(true)
    }, [])
    useEffect(() => {
        (async () => {
            const editor = new EditorJS({
                holder: 'editorjs',
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
                                    const { data: { user } } = await supabase.auth.getUser()
                                    if (!user) throw new Error('Unauthenticated')
                                    const fileName = `${Date.now()}-${file.name}`
                                    const { error } = await supabase.storage.from('blog-images').upload(`${user.id}/${fileName}`, file)
                                    if (error) throw error
                                    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(`${user.id}/${fileName}`)
                                    return {
                                        success: 1,
                                        file: { url: publicUrl }
                                    }
                                }
                            }
                        }
                    }
                },
                onReady() {
                    console.log('Editor Ready')
                },
            })
            if (id) {
                const { data } = await supabase.from('posts').select('*').eq('id', id).single()
                if (data) {
                    setTitle(data.title)
                    setExcerpt(data.excerpt || '')
                    await editor.render(data.content)
                }
            }
            setEditor(editor)
        })()
        return () => {
            if (editor?.destroy) editor.destroy()
        }
    }, [editor, id, supabase])
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
                        <div id="editorjs" className="max-w-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-4 min-h-96" />
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