sub itemChanged()
    item = m.top.itemContent
    if item = invalid then return
    m.poster.uri = item.hdPosterUrl
    m.title.text = left(item.title, 40)
    m.badge.text = item.badge
end sub

sub init()
    m.poster = m.top.findNode("poster")
    m.title = m.top.findNode("title")
    m.badge = m.top.findNode("badge")
    m.ribbon = m.top.findNode("ribbon")
    m.top.observeField("focusedChild", "focusChanged")
end sub

sub focusChanged()
    if m.top.isInFocusChain()
        m.poster.width = 258
        m.poster.height = 145
        m.ribbon.color = "0x00ACC1EE"
    else
        m.poster.width = 246
        m.poster.height = 138
        m.ribbon.color = "0x132733EE"
    end if
end sub
