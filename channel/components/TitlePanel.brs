' TitlePanel: shows one production's details and episode list.

sub init()
    m.poster = m.top.findNode("poster")
    m.title = m.top.findNode("title")
    m.meta = m.top.findNode("meta")
    m.desc = m.top.findNode("desc")
    m.play = m.top.findNode("play")
    m.favorite = m.top.findNode("favorite")
    m.watchLater = m.top.findNode("watchLater")
    m.episodes = m.top.findNode("episodes")
    m.episodesTitle = m.top.findNode("episodesTitle")

    m.play.observeField("buttonSelected", "playPressed")
    m.favorite.observeField("buttonSelected", "favoritePressed")
    m.watchLater.observeField("buttonSelected", "watchLaterPressed")
    m.episodes.observeField("itemSelected", "episodeSelected")
    m.top.observeField("visible", "visibleChanged")
end sub

sub visibleChanged()
    if m.top.visible then m.play.setFocus(true)
end sub

sub dataSet()
    d = m.top.titleData
    card = m.top.card
    if d = invalid then return

    m.poster.uri = valid(card.poster, "")
    m.title.text = firstOf(valid(d.name, ""), valid(card.title, "Untitled"))
    meta = ""
    parts = [validStr(card.quality), validStr(card.year), prefix("IMDb ", card.imdb), validStr(card.genres)]
    for each part in parts
        if part <> "" then meta = meta + "  -  " + part
    end for
    m.meta.text = mid(meta, 6)
    m.desc.text = valid(card.description, "")

    ' episode list: "S1 Episode 1 - ..."
    content = createObject("roSGNode", "ContentNode")
    m.episodeIds = []
    n = 0
    for each season in d.seasons
        snum = replaceStr(validStr(season.title), "Season ", "S")
        if snum = "" then snum = "S1"
        for each ep in season.episodes
            item = createObject("roSGNode", "ContentNode")
            item.title = snum + " " + validStr(ep.title)
            content.appendChild(item)
            m.episodeIds.push(ep)
            n++
        end for
    end for
    if n <= 1
        m.episodesTitle.visible = false
        m.episodes.visible = false
    else
        m.episodesTitle.visible = true
        m.episodes.visible = true
        m.episodes.content = content
    end if
    m.play.setFocus(true)
end sub

sub playPressed()
    emitPlay(0)
end sub

sub episodeSelected()
    emitPlay(m.episodes.itemSelected)
end sub

sub emitPlay(index as integer)
    if m.episodeIds = invalid or index >= m.episodeIds.count() then return
    ep = m.episodeIds[index]
    nxt = invalid
    if index + 1 < m.episodeIds.count() then nxt = m.episodeIds[index + 1]
    m.top.playEpisode = {episode: ep, next: nxt, index: index, count: m.episodeIds.count(), referer: m.top.titleData.watch_url}
end sub

sub favoritePressed()
    toggleList("favorite", m.favorite)
end sub

sub watchLaterPressed()
    toggleList("watch-later", m.watchLater)
end sub

sub toggleList(kind as string, button as object)
    card = m.top.card
    if card = invalid or card.id = "" then return
    label = capitalize(kind)
    adding = button.text = label
    action = "delete"
    if adding then action = "add"
    t = createObject("roSGNode", "ApiTask")
    t.url = m.top.serverUrl + "/list"
    t.method = "POST"
    t.body = formatJson({kind: kind, production_id: card.id, action: action})
    t.control = "RUN"
    if adding
        button.text = "* " + label
    else
        button.text = label
    end if
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    if key = "back"
        m.top.closed = true
        return true
    end if
    ' Left/Right walks Play -> Favorite -> Watch Later -> episode list
    order = [m.play, m.favorite, m.watchLater]
    if m.episodes.visible then order.push(m.episodes)
    current = -1
    for i = 0 to order.count() - 1
        if order[i].hasFocus() then current = i
    end for
    if current < 0 then return false
    if key = "right" and current + 1 < order.count()
        order[current + 1].setFocus(true)
        return true
    else if key = "left" and current > 0
        ' from the episode list, jump back to Play
        if order[current].isSameNode(m.episodes) then current = 1
        order[current - 1].setFocus(true)
        return true
    end if
    return false
end function

' ---- tiny helpers ----

function valid(v as object, fallback as string) as string
    if v = invalid then return fallback
    s = box(v).toStr()
    if s = invalid then return fallback
    return s.trim()
end function

function validStr(v as object) as string
    return valid(v, "")
end function

function replaceStr(s as string, old as string, newStr as string) as string
    out = ""
    i = 1
    while true
        p = instr(i, s, old)
        if p = 0
            return out + mid(s, i)
        end if
        out = out + mid(s, i, p - i) + newStr
        i = p + len(old)
    end while
end function

function firstOf(a as string, b as string) as string
    if a <> "" then return a
    return b
end function

function prefix(p as string, v as object) as string
    s = valid(v, "")
    if s = "" then return ""
    return p + s
end function

function capitalize(s as string) as string
    if s = "watch-later" then return "Watch Later"
    return ucase(left(s, 1)) + mid(s, 2)
end function
