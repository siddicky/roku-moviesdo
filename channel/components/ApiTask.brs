' ApiTask: one HTTP request per instance, executed on the Task's own thread
' (control="RUN" is set by the caller after the fields are assigned).
' On failure the response is set to a JSON error object so observers always fire.

sub init()
    m.top.functionName = "run"
end sub

sub run()
    url = m.top.url
    if url = "" or url = invalid
        m.top.response = "{""error"": ""no url""}"
        return
    end if
    print "DBG task "; m.top.method; " "; url
    ut = createObject("roUrlTransfer")
    ut.setUrl(url)
    ut.enableFreshConnection(true)
    port = createObject("roMessagePort")
    ut.setMessagePort(port)
    if m.top.method = "POST"
        ut.addHeader("Content-Type", "application/json")
        ok = ut.asyncPostFromString(m.top.body)
    else
        ok = ut.asyncGetToString()
    end if
    if not ok
        print "DBG task failed to start: "; ut.getFailureReason()
        m.top.response = "{""error"": ""transfer failed to start""}"
        return
    end if
    ev = wait(30000, port)
    if ev = invalid
        m.top.response = "{""error"": ""timeout""}"
        return
    end if
    code = ev.getResponseCode()
    body = ev.getString()
    print "DBG task done status="; code; " len="; len(body)
    if code >= 200 and code < 300
        m.top.response = body
    else
        m.top.response = formatJson({error: "HTTP " + code.toStr(), status: code})
    end if
end sub
