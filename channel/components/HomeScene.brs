' HomeScene: rail menu + RowList browser, hosts TitlePanel and VideoPanel.

sub init()
    m.rail = m.top.findNode("rail")
    m.rows = m.top.findNode("rows")
    m.busy = m.top.findNode("busy")
    m.overhang = m.top.findNode("overhang")
    m.titlePanel = m.top.findNode("titlePanel")
    m.videoPanel = m.top.findNode("videoPanel")

    m.paths = ["home", "movies", "tv-shows", "anime", "popular", "top-imdb", "last-added", "search", "my-list/favorites", "my-list/watch-later", "my-list/continue-watching", "my-list/watched"]
    labels = ["Home", "Movies", "TV Shows", "Anime", "Popular", "Top IMDb", "New Releases", "Search", "Favorites", "Watch Later", "Continue Watching", "Watched"]
    railContent = createObject("roSGNode", "ContentNode")
    for each l in labels
        item = createObject("roSGNode", "ContentNode")
        item.title = l
        railContent.appendChild(item)
    end for
    m.rail.content = railContent

    m.rail.observeField("itemSelected", "railSelected")
    m.rows.observeField("rowItemSelected", "cardSelected")
    m.rows.observeField("rowItemFocused", "rowFocused")
    m.titlePanel.observeField("playEpisode", "playRequested")
    m.titlePanel.observeField("closed", "titleClosed")
    m.videoPanel.observeField("closed", "videoClosed")

    m.cardsByVid = {}
    m.mode = "home"
    m.catalogPage = 1
    m.hasMore = false
    m.loadingMore = false
    m.currentCard = invalid
    m.nextEpisode = invalid
    m.callback = invalid
    m.task = invalid
    m.pendingOpen = ""
    m.responseText = ""

    m.rows.setFocus(true)
end sub

function startApp(data as object) as object
    print "DBG startApp url="; m.top.serverUrl
    m.titlePanel.serverUrl = m.top.serverUrl
    m.videoPanel.serverUrl = m.top.serverUrl
    m.pendingOpen = ""
    if data.contentId <> invalid then m.pendingOpen = data.contentId
    if data.search <> invalid and data.search <> ""
        runSearch(data.search)
    else if m.pendingOpen <> ""
        openPending()
    else
        loadMode("home")
    end if
    return invalid
end function

' ------------------------------------------------------------- data loading

sub loadMode(path as string)
    print "DBG loadMode "; path
    m.mode = path
    m.cardsByVid = {}
    m.catalogPage = 1
    m.hasMore = false
    m.loadingMore = false
    setBusy("Loading...")
    if path = "home"
        apiGet("/home", "homeLoaded")
    else
        apiGet("/catalog?path=" + urlEncode(path) + "&page=1", "catalogLoaded")
    end if
end sub

sub homeLoaded()
    data = taskJson()
    if data = invalid then return
    content = createObject("roSGNode", "ContentNode")
    if data.hero <> invalid and data.hero.count() > 0
        content.appendChild(makeRow("Featured", data.hero))
    end if
    for each row in data.rows
        content.appendChild(makeRow(row.title, row.items))
    end for
    m.rows.content = content
    m.rows.jumpToItem = 0
    setBusy("")
end sub

sub catalogLoaded()
    data = taskJson()
    if data = invalid then return
    m.hasMore = data.has_more
    content = createObject("roSGNode", "ContentNode")
    content.appendChild(makeRow(labelForPath(m.mode), data.items))
    m.rows.content = content
    m.rows.jumpToItem = 0
    setBusy("")
end sub

sub moreLoaded()
    data = taskJson()
    m.loadingMore = false
    if data = invalid then return
    m.hasMore = data.has_more
    row = m.rows.content.getChild(0)
    for each card in data.items
        rememberCard(card)
        row.appendChild(makeItem(card))
    end for
end sub

function makeRow(title as string, cards as object) as object
    row = createObject("roSGNode", "ContentNode")
    row.title = title
    for each card in cards
        rememberCard(card)
        row.appendChild(makeItem(card))
    end for
    return row
end function

function makeItem(card as object) as object
    cn = createObject("roSGNode", "ContentNode")
    cn.addFields({badge: "", vid: "", direct: false})
    cn.hdPosterUrl = card.poster
    cn.title = card.title
    badge = ""
    if card.quality <> invalid and card.quality <> "" then badge = card.quality
    if card.time_label <> invalid and card.time_label <> "" then badge = card.time_label
    cn.badge = badge
    cn.vid = card.id
    if card.watch_url <> invalid then cn.direct = true
    return cn
end function

sub rememberCard(card as object)
    if card.id <> invalid then m.cardsByVid[card.id] = card
end sub

' ------------------------------------------------------------ interactions

sub railSelected()
    index = m.rail.itemSelected
    path = m.paths[index]
    if path = "search"
        openSearchDialog()
        return
    end if
    m.overhang.title = m.rail.content.getChild(index).title + " - Movies Portal TV"
    loadMode(path)
    m.rows.setFocus(true)
end sub

sub rowFocused()
    if m.mode = "home" or m.mode = "search" then return
    focus = m.rows.rowItemFocused
    if focus[0] <> 0 then return
    count = m.rows.content.getChild(0).getChildCount()
    if focus[1] >= count - 4 and m.hasMore and not m.loadingMore
        m.loadingMore = true
        m.catalogPage++
        apiGet("/catalog?path=" + urlEncode(m.mode) + "&page=" + itostr(m.catalogPage), "moreLoaded")
    end if
end sub

sub cardSelected()
    sel = m.rows.rowItemSelected
    if sel[0] >= m.rows.content.getChildCount() then return
    item = m.rows.content.getChild(sel[0]).getChild(sel[1])
    card = m.cardsByVid[item.vid]
    if card = invalid then return
    m.currentCard = card
    if item.direct and card.watch_url <> invalid
        playDirect(card.id, card.watch_url)
    else
        openTitle(card)
    end if
end sub

sub openTitle(card as object)
    setBusy("Opening " + card.title + " ...")
    apiGet("/title?code=" + card.id, "titleLoaded")
end sub

sub titleLoaded()
    data = taskJson()
    if data = invalid then return
    m.titlePanel.card = m.currentCard
    m.titlePanel.titleData = data
    m.titlePanel.visible = true
    setBusy("")
end sub

sub playRequested()
    req = m.titlePanel.playEpisode
    if req = invalid or req.episode = invalid then return
    m.nextEpisode = req.next
    startVideo(req.episode, req.referer)
end sub

sub playDirect(videoId as string, watchUrl as string)
    m.nextEpisode = invalid
    startVideo({id: videoId, title: "", subtitles: []}, watchUrl)
end sub

sub startVideo(ep as object, referer as string)
    title = validText(ep.title)
    if title = "" then title = "Now Playing"
    full = {id: ep.id, title: title, subtitles: ep.subtitles, referer: referer}
    if full.subtitles = invalid then full.subtitles = []
    m.titlePanel.visible = false
    m.videoPanel.visible = true
    nxt = m.nextEpisode
    if nxt = invalid then nxt = {}
    m.videoPanel.nextEpisode = nxt
    m.videoPanel.episode = full
end sub

sub videoClosed()
    m.videoPanel.visible = false
    if m.currentCard <> invalid and m.currentCard.watch_url <> invalid
        m.rows.setFocus(true)
    else
        m.titlePanel.visible = true
    end if
    if m.mode = "my-list/continue-watching" or m.mode = "home" then loadMode(m.mode)
end sub

sub titleClosed()
    m.titlePanel.visible = false
    m.rows.setFocus(true)
end sub

sub openSearchDialog()
    dlg = createObject("roSGNode", "StandardKeyboardDialog")
    dlg.title = "Search Movies Portal"
    dlg.buttons = ["Search", "Cancel"]
    dlg.text = ""
    dlg.observeField("buttonSelected", "searchSubmitted")
    dlg.observeField("wasClosed", "searchClosed")
    m.dlg = dlg
    m.top.dialog = dlg
end sub

sub searchSubmitted(ev as object)
    q = ""
    if ev.getData() = 0 then q = m.dlg.text.trim()
    m.dlg.close = true
    if q <> "" then runSearch(q)
end sub

sub runSearch(q as string)
    m.searchQuery = q
    m.overhang.title = "Search: " + q
    m.mode = "search"
    setBusy("Searching...")
    apiGet("/search?q=" + urlEncode(q), "searchLoaded")
end sub

' Opens the deep-linked title, using its card from loaded results when present
sub openPending()
    code = m.pendingOpen
    m.pendingOpen = ""
    card = m.cardsByVid[code]
    if card = invalid then card = {id: code, title: "title"}
    m.currentCard = card
    openTitle(card)
end sub

sub searchClosed()
    m.rail.setFocus(true)
end sub

sub searchLoaded()
    data = taskJson()
    if data = invalid then return
    content = createObject("roSGNode", "ContentNode")
    content.appendChild(makeRow("Results for " + m.searchQuery, data.items))
    m.rows.content = content
    if data.items.count() = 0
        setBusy("No results for " + m.searchQuery)
        return
    end if
    m.rows.setFocus(true)
    setBusy("")
    if m.pendingOpen <> "" then openPending()
end sub

' ------------------------------------------------------------- plumbing

sub apiGet(path as string, callback as string)
    m.callback = callback
    task = createObject("roSGNode", "ApiTask")
    task.observeField("response", "apiDone")
    task.url = m.top.serverUrl + path
    task.control = "RUN"
    m.task = task
end sub

sub apiDone(ev as object)
    ' Ignore responses from a request that a newer one superseded
    if m.task = invalid or not ev.getRoSGNode().isSameNode(m.task) then return
    print "DBG apiDone len="; len(m.task.response)
    response = m.task.response
    if response = invalid then response = ""
    m.responseText = response
    cb = m.callback
    m.callback = invalid
    if response = ""
        setBusy("Server unreachable - check server_url in manifest")
        return
    end if
    if cb = "homeLoaded"
        homeLoaded()
    else if cb = "catalogLoaded"
        catalogLoaded()
    else if cb = "moreLoaded"
        moreLoaded()
    else if cb = "titleLoaded"
        titleLoaded()
    else if cb = "searchLoaded"
        searchLoaded()
    end if
end sub

function taskJson() as object
    if m.responseText = invalid or m.responseText = "" then return invalid
    data = parseJson(m.responseText)
    if data = invalid
        setBusy("Bad server response")
        return invalid
    end if
    if data.error <> invalid
        setBusy("Error: " + data.error)
        return invalid
    end if
    return data
end function

sub setBusy(text as string)
    m.busy.text = text
end sub

function validText(v as object) as string
    if v = invalid then return ""
    return box(v).toStr().trim()
end function

function itostr(n as integer) as string
    return box(n).toStr()
end function

function labelForPath(path as string) as string
    map = {"home": "Home", "movies": "Movies", "tv-shows": "TV Shows", "anime": "Anime", "popular": "Popular", "top-imdb": "Top IMDb", "last-added": "New Releases", "my-list/favorites": "Favorites", "my-list/watch-later": "Watch Later", "my-list/continue-watching": "Continue Watching", "my-list/watched": "Watched", "search": "Search"}
    if map[path] <> invalid then return map[path]
    return path
end function

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    ' Rail <-> content focus only while browsing (panels handle their own keys)
    if m.titlePanel.visible or m.videoPanel.visible then return false
    if m.rows.hasFocus()
        if key = "left" or key = "back"
            m.rail.setFocus(true)
            return true
        end if
    else if m.rail.hasFocus()
        if key = "right"
            m.rows.setFocus(true)
            return true
        end if
    end if
    return false
end function
