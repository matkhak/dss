function getListDictionary() {

    var query =

        "SELECT a.ID_CALC,a.VERSION_CALC, a.NAME_CALC,a.IND,  b.CREATION_DATE, "+
        "CASE "+
        "    WHEN "+
        "         b.AUTHOR is null then c.ADRP__NAME_TEXT"+
        "            else b.AUTHOR"+
        "    END"+
        " AUTHOR  "+
        "FROM Z_BOBJ_REPO.T_CALC a  "+
        "left outer join Z_BOBJ_REPO.T_HISTORY_STATUS b  "+
        "on  a.ID_CALC=b.ID_OBJECT and a.VERSION_CALC=b.VERSION   and   b.STATUS_WAS =0   "+
        "left outer join \"_SYS_BIC\".\"sngias.spravochniki.mm/CV_SP_USERS\" c "+
        "on  b.AUTHOR=c.USR21__BNAME  "+
        " where a.IS_ACTIVE=true ";

    var conn = $.db.getConnection();
    var pstmt = conn.prepareStatement(query);
    var rs = pstmt.executeQuery();
    var data = [];
    while (rs.next()) {

        let author, date;
        // суперхитрая схема: если пустое значение автора и даты создания, то по
        // умолчанию ставим СИМ и указанную дату.
        if (!rs.getNString(5)) {
            author = 'Солкоч Иван Михайлович';
        } else {
            author = rs.getNString(5);
        }
        if (!rs.getNString(6)) {
            date = '2016-12-31 00:00:00.0000000';
        } else {
            date = rs.getNString(6);
        }

        data.push({
            "iId" : rs.getInteger(1),
            "iVersion" : rs.getInteger(2),
            "sNameText" : rs.getNString(3),
            "sName" : rs.getNString(4)+" " + rs.getNString(3),
            "sInd" : rs.getNString(4),
            "sAuthor" : author,
            "sDate" : date.substring(0, 19),
            "sType" : "calc",
            "myKey": "olala"
        });
    }

    $.response.setBody(JSON.stringify(data));
    $.response.contentType = 'application/json';
    $.response.status = $.net.http.OK;

    conn.close();

}
getListDictionary();
