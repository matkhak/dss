function getListDictionary() {

    var conn = $.db.getConnection();
    var pstmt = conn.prepareStatement(
        "SELECT a.ID_DICTIONARY, a.VERSION, a.NAME_DICTIONARY, a.NAME_VIEW, b.AUTHOR, b.CREATION_DATE " +
        "FROM Z_BOBJ_REPO.T_DICTIONARY a " +
        "left outer join Z_BOBJ_REPO.T_HISTORY_STATUS b " +
        "on a.ID_DICTIONARY = b.ID_OBJECT " +
        "and a.VERSION = b.VERSION and b.STATUS_WAS = 0 " +
        "where a.IS_ACTIVE = true "
    );
    var rs = pstmt.executeQuery();
    var data = [];
    while (rs.next()) {
        data.push({
            "id": rs.getInteger(1),
            "version": rs.getInteger(2),
            "name": rs.getNString(3),
            "view": rs.getString(4),
            // нужная модернизация зависимого кода, поэтому пока два варианта
            "iId": rs.getInteger(1),
            "iVersion": rs.getInteger(2),
            "sName": rs.getNString(3),
            "sAuthor": rs.getNString(5),
            "sDate": rs.getNString(6),
            "sType": 'dict'
        });
    }

    $.response.setBody(JSON.stringify(data));
    $.response.contentType = 'application/json';
    $.response.status = $.net.http.OK;
    // conn.commit();
    conn.close();

}
getListDictionary();
