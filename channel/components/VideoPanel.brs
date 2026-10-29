' VideoPanel: resolves a stream for one episode and plays it on the Video
' node; saves progress via POST /watched; retries lower quality on error;
' auto-plays the next episode of the season when it finishes.

sub init()
    m.video = m.top.findNode("video")
    m.status = m.top.findNode("status")
    m.video.observeField("state", "videoStateChanged")
    m.video.observeField("position", "positionChanged")
    m.task = invalid
    m.lastSaved = 0
    m.qualityIndex = 0
    m.streams = []
    m.resumeSeconds = 0
    m.pendingTrack = ""
end sub

sub startEpisode()
    ep = m.top.episode
    if ep = invalid or ep.id = "" then return
    m.lastSaved = 0
    m.qualityIndex = 0
    m.streams = []
    m.resumeSeconds = 0
    showStatus("Loading " + ep.title + " ...")
    m.video.visible = true
    m.video.setFocus(true)
    m.task = createObject("roSGNode", "ApiTask")
    m.task.observeField("response", "streamResolved")
    m.task.url = m.top.serverUrl + "/stream?video_id=" + ep.id + "&referer=" + urlEncode(ep.referer)
    m.task.control = "RUN"
end sub

sub streamResolved()
    if m.task = invalid or m.task.response = "" then return
    data = parseJson(m.task.response)
    if data = invalid
        showStatus("Bad server response")
        return
    end if
    if data.error <> invalid
        showStatus(data.error)
        return
    end if
    if data.streams = invalid or data.streams.count() = 0
        showStatus("No streams returned")
        return
    end if
    m.streams = orderStreams(data.streams)
    m.resumeSeconds = int(data.watched_seconds)
    playQuality(0)
end sub

sub playQuality(index as integer)
    if index >= m.streams.count()
        showStatus("No playable stream")
        return
    end if
    m.qualityIndex = index
    item = m.streams[index]
    ep = m.top.episode
    content = createObject("roSGNode", "ContentNode")
    content.title = ep.title
    content.streamFormat = "mp4"
    content.url = item.url
    cc = []
    for each s in ep.subtitles
        if s.url <> invalid and s.url <> ""
            cc.push({TrackName: s.label, Language: "en", TrackURL: m.top.serverUrl + "/subtitles?u=" + urlEncode(s.url)})
        end if
    end for
    if cc.count() > 0
        content.subtitleConfig = cc
        m.pendingTrack = cc[0].TrackName
    end if
    if m.resumeSeconds > 5
        content.bookmark = m.resumeSeconds
    end if
    m.video.content = content
    m.video.control = "play"
    hideStatus()
end sub

sub videoStateChanged()
    state = m.video.state
    if state = "playing" and m.pendingTrack <> ""
        m.video.subtitleTrack = m.pendingTrack
        m.pendingTrack = ""
    else if state = "error"
        ' step down one quality and retry
        if m.qualityIndex + 1 < m.streams.count()
            showStatus("Retrying at " + m.streams[m.qualityIndex + 1].label + " ...")
            playQuality(m.qualityIndex + 1)
        else
            showStatus("Playback error")
        end if
    else if state = "finished"
        saveProgress(true)
        nxt = m.top.nextEpisode
        if nxt <> invalid and nxt.id <> invalid and nxt.id <> ""
            m.top.episode = nxt
        else
            m.top.closed = true
        end if
    end if
end sub

sub positionChanged()
    curPos = int(m.video.position)
    dur = int(m.video.duration)
    if dur > 0 and curPos - m.lastSaved >= 10
        m.lastSaved = curPos
        postWatched(curPos, dur)
    end if
end sub

sub saveProgress(finished as boolean)
    curPos = int(m.video.position)
    dur = int(m.video.duration)
    if finished then curPos = dur
    if curPos > 0 and dur > 0 then postWatched(curPos, dur)
end sub

sub postWatched(curPos as integer, dur as integer)
    ep = m.top.episode
    if ep = invalid or ep.id = "" then return
    body = formatJson({video_id: ep.id, watched_seconds: curPos, duration_seconds: dur})
    t = createObject("roSGNode", "ApiTask")
    t.url = m.top.serverUrl + "/watched"
    t.method = "POST"
    t.body = body
    t.control = "RUN"
end sub

' Best-first, capped at 1080p, so the error retry really steps down.
function orderStreams(streams as object) as object
    capped = []
    for each st in streams
        if val(validLabel(st)) <= 1080 then capped.push(st)
    end for
    if capped.count() = 0 then capped = streams
    out = []
    for each st in capped
        h = val(validLabel(st))
        i = 0
        while i < out.count() and val(validLabel(out[i])) >= h
            i++
        end while
        out = insertAt(out, i, st)
    end for
    return out
end function

function validLabel(st as object) as string
    if st.label = invalid then return "0"
    return box(st.label).toStr()
end function

function insertAt(arr as object, index as integer, value as object) as object
    out = []
    for i = 0 to arr.count() - 1
        if i = index then out.push(value)
        out.push(arr[i])
    end for
    if index >= arr.count() then out.push(value)
    return out
end function

sub showStatus(text as string)
    m.status.text = text
    m.status.visible = true
end sub

sub hideStatus()
    m.status.visible = false
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    if key = "back"
        saveProgress(false)
        m.video.control = "stop"
        m.top.closed = true
        return true
    end if
    return false
end function
