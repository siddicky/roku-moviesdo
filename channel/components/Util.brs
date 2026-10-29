' Shared helpers. Component scripts can't see source/ functions, so each
' component that needs these includes this file with a <script> tag.

' Percent-encodes for a query value. Pure BrightScript because roUrlTransfer
' can't be created on the render thread. ASCII only (all our values are).
function urlEncode(s as string) as string
    safe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~"
    digits = "0123456789ABCDEF"
    out = ""
    for i = 1 to len(s)
        c = mid(s, i, 1)
        if instr(1, safe, c) > 0
            out = out + c
        else
            n = asc(c)
            out = out + "%" + mid(digits, (n \ 16) + 1, 1) + mid(digits, (n mod 16) + 1, 1)
        end if
    end for
    return out
end function
