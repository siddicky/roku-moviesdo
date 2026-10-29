sub Main(args as dynamic)
    screen = createObject("roSGScreen")
    port = createObject("roMessagePort")
    screen.setMessagePort(port)
    scene = screen.createScene("HomeScene")
    screen.show()

    scene.serverUrl = readManifestValue("server_url")
    print "DBG serverUrl="; scene.serverUrl
    ' Deep links (ECP /launch/dev?search=...&contentId=...)
    launch = {}
    if type(args) = "roAssociativeArray"
        if args.search <> invalid then launch.search = args.search
        if args.contentId <> invalid then launch.contentId = args.contentId
    end if
    scene.callFunc("startApp", launch)

    while true
        msg = wait(0, port)
        if type(msg) = "roSGScreenEvent" and msg.isScreenClosed() then return
    end while
end sub

function readManifestValue(key as string) as string
    text = ReadAsciiFile("pkg:/manifest")
    for each line in text.split(chr(10))
        line = line.trim()
        if line <> "" and left(line, 1) <> "#"
            eq = line.instr("=")
            if eq > 0 and lcase(left(line, eq).trim()) = lcase(key)
                return mid(line, eq + 2).trim()
            end if
        end if
    end for
    return ""
end function
