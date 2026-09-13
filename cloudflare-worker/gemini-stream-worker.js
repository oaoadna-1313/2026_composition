export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        let allKeys = [];
        for (const [envName, envVal] of Object.entries(env)) {
            if (envName.startsWith('GEMINI_API_KEY') && typeof envVal === 'string') {
                const extracted = envVal.split(/[,;\n]+/).map(k => k.trim()).filter(k => k.length > 0);
                allKeys.push(...extracted);
            }
        }
        const keyPool = Array.from(new Set(allKeys));

        const url = new URL(request.url);

        // 列出所有可用模型 (除錯檢查用)
        if (request.method === 'GET' && url.pathname === '/models') {
            const results = {};
            for (let i = 0; i < keyPool.length; i++) {
                const key = keyPool[i];
                try {
                    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                    const data = await resp.json();
                    results[`key_${i+1}`] = data.models ? data.models.map(m => m.name.replace('models/', '')) : data;
                } catch (e) {
                    results[`key_${i+1}`] = { error: e.message };
                }
            }
            return new Response(JSON.stringify(results, null, 2), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        // 健康檢查
        if (request.method === 'GET') {
            return new Response(JSON.stringify({
                status: 'online',
                message: '🚀 Gemini Stream Worker 超智慧多金鑰池全力運作中！',
                keysLoaded: keyPool.length,
                estimatedCapacityRPM: keyPool.length * 15,
                timestamp: new Date().toISOString()
            }, null, 2), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        // 處理 POST 請求
        if (request.method === 'POST') {
            if (keyPool.length === 0) {
                return new Response(JSON.stringify({
                    error: { message: '未偵測到任何 GEMINI_API_KEY！請在 Settings > Variables and Secrets 中新增金鑰。' }
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
                });
            }

            try {
                const body = await request.json();
                
                // 智慧嘗試模型序列：先試使用者指定或 gemini-2.5-flash，再嘗試 gemini-2.0-flash / gemini-1.5-flash
                const requestedModel = body.model;
                const candidateModels = requestedModel 
                    ? [requestedModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
                    : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
                
                const isStream = body.stream !== false;
                const { model: _, stream: __, ...geminiPayload } = body;

                // 打亂 Key 順序均勻負載
                const shuffledKeys = [...keyPool].sort(() => Math.random() - 0.5);

                let lastError = null;
                let lastStatus = 500;

                // 雙層輪換嘗試：遍歷 Key 與可用模型
                for (let k = 0; k < shuffledKeys.length; k++) {
                    const activeKey = shuffledKeys[k];

                    for (let m = 0; m < candidateModels.length; m++) {
                        const targetModel = candidateModels[m];
                        const endpoint = isStream
                            ? `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${activeKey}`
                            : `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`;

                        try {
                            const googleResponse = await fetch(endpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(geminiPayload)
                            });

                            if (googleResponse.ok) {
                                if (isStream) {
                                    return new Response(googleResponse.body, {
                                        status: 200,
                                        headers: {
                                            ...corsHeaders,
                                            'Content-Type': 'text/event-stream; charset=utf-8',
                                            'Cache-Control': 'no-cache, no-transform',
                                            'Connection': 'keep-alive',
                                            'X-Active-Model': targetModel,
                                            'X-Key-Index': String(k + 1)
                                        }
                                    });
                                } else {
                                    const data = await googleResponse.json();
                                    return new Response(JSON.stringify(data), {
                                        status: 200,
                                        headers: {
                                            ...corsHeaders,
                                            'Content-Type': 'application/json; charset=utf-8',
                                            'X-Active-Model': targetModel,
                                            'X-Key-Index': String(k + 1)
                                        }
                                    });
                                }
                            }

                            lastStatus = googleResponse.status;
                            lastError = await googleResponse.text();

                            // 若為 404 (該模型不存在)，嘗試下一個模型
                            if (lastStatus === 404) {
                                continue;
                            }
                            // 若為 429/503 (限速或忙碌)，換下一個 Key
                            if (lastStatus === 429 || lastStatus === 503) {
                                break;
                            }
                        } catch (fetchErr) {
                            lastError = fetchErr.message;
                        }
                    }
                }

                return new Response(lastError || '連線忙碌，請稍後再試', {
                    status: lastStatus,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
                });

            } catch (err) {
                return new Response(JSON.stringify({
                    error: { message: `代理轉發發生錯誤：${err.message}` }
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
                });
            }
        }

        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }
};
